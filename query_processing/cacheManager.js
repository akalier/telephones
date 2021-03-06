const redis = require('redis');

const configVariables = require('../config-variables.js');

const CLASS_NAME = "Cache Manager";

const REDIS_PORT = 6379;
const redisClient = redis.createClient(REDIS_PORT);

function setDataToCache(id, data) {
    if (configVariables.cache === "redis") {
        setDataToRedis(id, data);
    } else {
        //for future implementations
    }
}

function setDataCountToCache(id, data) {
    if (configVariables.cache === "redis") {
        setDataCountToRedis(id, data);
    } else {
        //for future implementations
    }
}

function searchInCache(id) {
    if (configVariables.cache === "redis") {
        return searchInRedis(id);
    } else {
        //for future implementations
    }
}

function flushCache() {
    if (configVariables.cache === "redis") {
        return flushRedis();
    } else {
        //for future implementations
    }
}

function setDataToRedis(id, data) {

    redisClient.setex(id, configVariables.DATA_EXPIRATION, JSON.stringify(data));
    //console.log(CLASS_NAME + ": " + "Data set to redis cache.");
    //console.log(CLASS_NAME + ": " + "Data set to redis cache: " + JSON.stringify(data));
}

function setDataCountToRedis(id, data) {

    redisClient.setex(id, configVariables.DATA_EXPIRATION, data);
    //console.log(CLASS_NAME + ": " + "Data count set to redis: " + id + " --- " + data);
}

function searchInRedis(id) {

    return new Promise(function (resolve, reject) {
        //first, try to get data from cache
        redisClient.get(id, function (err, data) {
            if (err) {
                //error
                reject("Redis error");
                throw err;
            }

            //console.log(CLASS_NAME + ": " + "Data found in cache: " + id + " - " + data);
            resolve(data);
        });
    });

}

function flushRedis() {

    redisClient.flushdb( function (err, succeeded) {
        console.log(CLASS_NAME + ": " + "flush " + succeeded); // will be true if successfull
    });

}

// create ID of object by sorting the values by key
function createID(data, page = 1, searchString = null) {
    var sortedData = sortObj(data);

    var id = "";

    for (var property1 in sortedData) {

        id += `${property1}:IN(${sortedData[property1]})`;
        id += configVariables.DELIMITER;
    }

    id = id.substring(0, id.length - 1);
    id = id.replace('%,', '');

    // if fulltext search is included
    if (searchString) {
        if (id === "") {
            id = configVariables.FULLTEXT_DELIMITER + searchString
        } else {
            id = configVariables.FULLTEXT_DELIMITER + searchString + configVariables.DELIMITER + id;
        }
    }

    if (page) {
        id += configVariables.PAGE_DELIMITER + page;
    }

    //console.log(CLASS_NAME + ": " + "generated id: " + id);
    return id;
}

// sort object by keys
function sortObj(obj) {
    return Object.keys(obj).sort().reduce((accumulator, currentValue) => {
        accumulator[currentValue] = obj[currentValue];
        return accumulator;
    }, {});
}

module.exports.setDataToCache = setDataToCache;
module.exports.setDataCountToCache = setDataCountToCache;
module.exports.searchInCache = searchInCache;
module.exports.flushCache = flushCache;
module.exports.createID = createID;