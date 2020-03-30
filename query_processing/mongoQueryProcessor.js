const redis = require('redis');
const MongoClient = require('mongodb').MongoClient;

const REDIS_PORT = 6379;

const DATA_EXPIRATION = 3600;
const COLLECTION = 'telefon';

const client = redis.createClient(REDIS_PORT);

//query has to become an object like this 
//query = { 'ram': { $gt: 12000 }, 'model': { $regex: /^A/ }, 'vyrobce': 'Apple', 'konstrukce': 'dotykovy', 'os': 'Android' }
function createQuery(parameters) {

    var query = {};

    for (var propertyName in parameters) {

        if (Array.isArray(parameters[propertyName])) {
            //there is an array of parameters (e.g. multiple brands)
            let listOfValues = [];
            parameters[propertyName].forEach(paramName => {
                if (isNaN(paramName)) {
                    listOfValues.push(paramName);
                } else {
                    listOfValues.push(Number(paramName));
                }
            });
            query[propertyName] = { $in : listOfValues};
        } else {
            //single parameter
            if (isNaN(parameters[propertyName])) {
                query[propertyName] = parameters[propertyName];
            } else {
                query[propertyName] = Number(parameters[propertyName]);
            }
        }
    }

    console.log("mongoQueryProcessor: created query: " + JSON.stringify(query));
    return query;
}

function query(parameters, res) {

    console.log("______________________");

    let query = createQuery(parameters);

    let id = createID(parameters);

    //first, try to get data from redis
    client.get(id, function (err, data) {
        if (err) {
            //error
            throw err;
        }

        if (data !== null && data !== 'undefined') {
            console.log("mongoQueryProcessor: Data found in redis!");

            extendExpiration(id);

            //console.log("mysqlQueryProcessor (redis data): " + data);

            res.render('results', {
                title: "Výsledky vyhledávání",
                telephones: JSON.parse(data)
            });
            return;
        } else {
            console.log("mongoQueryProcessor: Data NOT found in redis.");

            //TODO: i cannot always connect to a DB like this
            MongoClient.connect("mongodb://localhost:27017/MyDb", function (err, database) {

                if (err) throw err;
                console.log("Connected to mongoDB!");

                var db = database.db("projekt");

                db.collection(COLLECTION).find(query).limit(10).toArray(function (err, result) {
                    //console.log("Requesting DB.");
                    if (err) {
                        console.log("mongoQueryProcessor: " + err);
                        throw err;
                    }
                    //console.log("Data found in DB.");
                    setDataToRedis(id, result);
                    res.render('results', {
                        title: "Výsledky vyhledávání",
                        telephones: result
                    });
                    return;
                });
            });
        };

    });

}

function setDataToRedis(id, data) {

    client.setex(id, DATA_EXPIRATION, JSON.stringify(data));
    console.log("mongoQueryProcessor: Data set to redis.");
    //console.log("mongoQueryProcessor: Data set to redis: " + JSON.stringify(data));
}

function extendExpiration(id) {

    client.expire(id, DATA_EXPIRATION);
    console.log("mongoQueryProcessor: Expiration extended.");
}

// create ID of object by sorting the values by key
function createID(data) {
    var sortedData = sortObj(data);
    var id = "";

    for (var property1 in sortedData) {

        id += `${property1}:IN(${sortedData[property1]})`;

        /*if (typeof sortedData[property1] === 'object') {
            console.log("nn ");
            let temp = (sortedData[property1]);
            id += temp[Object.keys(temp)[0]];
        } else if (Array.isArray(sortedData[property1])) {
            console.log("array " + array);
            id += "IN("
            sortedData[property1].forEach(paramName => {
                console.log("paramName " + paramName);
                id += `${paramName},`
            });
            id += ")";
        }
        else {
            id += sortedData[property1];
        }*/
        id += "_";
    }

    id = id.substring(0, id.length - 1);
    console.log("mongoQueryProcessor: generated id: " + id);
    return id;
}

// sort object by keys
function sortObj(obj) {
    return Object.keys(obj).sort().reduce((accumulator, currentValue) => {
        accumulator[currentValue] = obj[currentValue];
        return accumulator;
    }, {});
}

module.exports.query = query;