const redis = require('redis');
const Memcached = require('memcached');

const configVariables = require('../config-variables.js');

var memcached = new Memcached();
/*memcached.connect('localhost:11211', function (err, conn) {
    if (err) {
        console.log(conn.server, 'error while memcached connection!!');
    }
});*/

const REDIS_PORT = 6379;
const redisClient = redis.createClient(REDIS_PORT);

function setDataToCache(id, data) {
    if (configVariables.cache === "redis") {
        setDataToRedis(id, data);
    } else {
        setDataToMemcached(id, data);
    }
}

function setDataCountToCache(id, data) {
    if (configVariables.cache === "redis") {
        setDataCountToRedis(id, data);
    } else {
        setDataCountToMemcached(id, data);
    }
}

function searchInCache(id) {
    if (configVariables.cache === "redis") {
        return searchInRedis(id);
    } else {
        return searchInMemcached(id);
    }
}

function flushCache() {
    if (configVariables.cache === "redis") {
        return flushRedis();
    } else {
        return flushMemcached();
    }
}

function setDataToRedis(id, data) {

    redisClient.setex(id, configVariables.DATA_EXPIRATION, JSON.stringify(data));
    //console.log("redis: Data set to cache.");
    //console.log("mysqlQueryProcessor: Data set to cache: " + JSON.stringify(data));
}

function setDataToMemcached(id, data) {

    memcached.set(id, JSON.stringify(data), configVariables.DATA_EXPIRATION);
    //console.log("memcached: Data set to cache.");
    //console.log("mysqlQueryProcessor: Data set to cache: " + JSON.stringify(data));
}

function setDataCountToRedis(id, data) {

    redisClient.setex(id, configVariables.DATA_EXPIRATION, data);
    //console.log("cacheManager: Data count set to redis: " + id + " --- " + data);
}

function setDataCountToMemcached(id, data) {

    memcached.set(id, data, configVariables.DATA_EXPIRATION);
    console.log("memcached: Data set to cache.");
    //console.log("mysqlQueryProcessor: Data set to cache: " + JSON.stringify(data));
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

            //console.log("cacheManager: Data found in cache: " + id + " --- " + data);
            resolve(data);
        });
    });

}

function searchInMemcached(id) {

    return new Promise(function (resolve, reject) {
        //first, try to get data from cache
        memcached.get(id, function (err, data) {
            if (err) {
                //error
                reject("Memcached error");
                throw err;
            }

            console.log(data);
            resolve(data);
        });
    });

}

function flushRedis() {

    redisClient.flushdb( function (err, succeeded) {
        console.log(succeeded); // will be true if successfull
    });

}

function flushMemcached() {
    
    //to be implemented

}

/*let id = "15w18";
let data = [{ a: 1, b: 3, c: "444" }]

setDataToCache(id, data);
searchInCache(id).then((data) => {
    console.log(data);
});*/

module.exports.setDataToCache = setDataToCache;
module.exports.setDataCountToCache = setDataCountToCache;
module.exports.searchInCache = searchInCache;
module.exports.flushCache = flushCache;
