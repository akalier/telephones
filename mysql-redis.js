var mysql = require('mysql');
const config = require('./config.js');
const configVariables = require('./config-variables.js');

const cacheManager = require('./query_processing/cacheManager.js');

const TABLE_NAME = 'telefon';
const DATA_EXPIRATION = 3600;

const redis = require('redis');

const REDIS_PORT = 6379;
const client = redis.createClient(REDIS_PORT);

var con = mysql.createPool({
    host: "localhost",
    user: "root",
    //TODO: change pwd
    password: "mysql123",
    database: "projekt"
});

con.getConnection(function (err, connection) {
    if (err) {
        console.log(err);
        throw err;
    }
    console.log("Connected to mySQL!");

    var time = new Date();

    config.performQueries().then(() => {
        var newTime = new Date();
        console.log("Total time: " + (newTime - time) / 1000);
        console.log("Closing database...");
        //database.close();
        connection.release();
    }).catch((err) => {
        console.log(err);
    })

});

function extendExpiration(id) {

    client.expire(id, DATA_EXPIRATION);
    console.log("Expiration extended.");

}

// create ID of object by sorting the values by key
function createID(data) {
    var sortedData = sortObj(data);
    var id = "";
    if (configVariables.explain) {
        id += "EXPLAIN$";
    }

    for (var property1 in sortedData) {
        if (typeof sortedData[property1] === 'object') {
            let temp = (sortedData[property1]);
            id += temp[Object.keys(temp)[0]];
        } else {
            id += sortedData[property1];
        }
        id += "$";
    }

    id = id.substring(0, id.length - 1);
    id = id.replace(" ", "$");
    return id;
}

// sort object by keys
function sortObj(obj) {
    return Object.keys(obj).sort().reduce((accumulator, currentValue) => {
        accumulator[currentValue] = obj[currentValue];
        return accumulator;
    }, {});
}

function createQuery(parameters, sql) {

    for (var propertyName in parameters) {
        sql = sql + propertyName + " " + parameters[propertyName] + " AND ";
    }

    sql = sql.substring(0, sql.length - 5);

    return sql;
}

// this function tries to get data from redis. If failed, loads them from DB.
function requestData(parameters) {

    let sql = "SELECT * FROM " + TABLE_NAME + " WHERE ";
    sql = createQuery(parameters, sql);
    //console.log("generated sql: " + sql);

    let id = createID(parameters);

    return new Promise((resolve, reject) => {
        if (configVariables.useCache) {

            let cachePromise = cacheManager.searchInCache(id);

            cachePromise.then((data) => {
                if (err) {
                    reject(err);
                }

                if (data !== null && data !== 'undefined') {
                    //console.log("Data found in redis!");

                    //extendExpiration(id);

                    //console.log(data);
                    resolve(data);
                } else {
                    //console.log("Data NOT found in redis.");
                    // the particular query
                    con.query(sql, function (err, result, fields) {
                        if (err) {
                            reject(err);
                        }
                        //console.log("Data found in DB.");

                        cacheManager.setDataToCache(id, result);
                        //console.log(result);
                        resolve(result);
                    });
                }
            });
        } else {

            con.query(sql, function (err, result, fields) {
                if (err) {
                    reject(err);
                }
                //console.log("Data found in DB.");
                //console.log(result);
                resolve(result);
            });

        }
    })

}

// this function tries to get data (count) from redis. If failed, loads them from DB.
function requestDataCount(parameters) {

    let sql;

    if (configVariables.explain) {
        //console.log("WARNING: using explain");
        sql = "EXPLAIN SELECT * FROM " + TABLE_NAME + " WHERE ";
    } else {
        sql = "SELECT COUNT(*) as count FROM " + TABLE_NAME + " WHERE ";
    }

    sql = createQuery(parameters, sql);
    //console.log("generated sql: " + sql);

    let id = createID(parameters);
    id = id + "$count";
    //console.log("generated id: " + id);

    return new Promise((resolve, reject) => {
        if (configVariables.useCache) {

            let cachePromise = cacheManager.searchInCache(id);

            cachePromise.then((data) => {

                if (data !== null && data !== 'undefined') {
                    //console.log("Data found in redis!");

                    //extendExpiration(id);

                    //console.log(data);
                    resolve(data);
                } else {
                    //console.log("Data NOT found in redis.");
                    // the particular query
                    con.query(sql, function (err, result, fields) {
                        if (err) {
                            reject(err);
                        }
                        //console.log("Data found in DB.");

                        var vysledek;
                        if (configVariables.explain) {
                            if (result[0].filtered <= 0) {
                                result[0].filtered = 0.001;
                            }
                            //console.log("rows: " + result[0].rows);
                            //console.log("filtered: " + result[0].filtered);
                            //console.log((result[0].rows) + " / (100 / " + result[0].filtered + ")");
                            vysledek = (result[0].rows) / (100 / result[0].filtered);
                        } else {
                            vysledek = result[0].count;
                        }

                        //console.log(vysledek);
                        cacheManager.setDataToCache(id, vysledek);
                        resolve(vysledek);
                    });
                }

            })

        } else {

            con.query(sql, function (err, result, fields) {
                if (err) {
                    reject(err);
                }
                //console.log("Data found in DB.");

                var vysledek;
                if (configVariables.explain) {
                    if (result[0].filtered <= 0) {
                        result[0].filtered = 0.001;
                    }
                    //console.log("rows: " + result[0].rows);
                    //console.log("filtered: " + result[0].filtered);
                    //console.log((result[0].rows) + " / (100 / " + result[0].filtered + ")");
                    vysledek = (result[0].rows) / (100 / result[0].filtered);
                } else {
                    vysledek = result[0].count;
                }

                //console.log(vysledek);
                resolve(vysledek);
            });

        }
    })

}

module.exports.requestDataCount = requestDataCount;
module.exports.requestData = requestData;