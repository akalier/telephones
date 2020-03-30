const config = require('./config.js');
const configVariables = require('./config-variables.js');

//const express = require('express');
const redis = require('redis');
const MongoClient = require('mongodb').MongoClient;

const REDIS_PORT = 6379;

const DATA_EXPIRATION = 3600;
const COLLECTION = 'telefon';

const client = redis.createClient(REDIS_PORT);

// Connect to the db
MongoClient.connect("mongodb://localhost:27017/MyDb", function (err, database) {

  if (err) throw err;
  console.log("Connected to mongoDB!");

  var db = database.db("projekt");

  var time = new Date();

  //5000 mongo queries with 50% same - all data
  config.performQueries(db).then(() => {
    var newTime = new Date();
    console.log("Total time: " + (newTime - time) / 1000);
    console.log("Closing database...");
    database.close();
  })

});


// save data count by query id to redis
function setDataCountToRedis(id, response) {

  client.setex(id, DATA_EXPIRATION, JSON.stringify(response));

  //console.log("Data set to redis.");
  //console.log("Data set to redis: " + response);
}

// save data by query id to redis
function setDataToRedis(id, response) {

  client.setex(id, DATA_EXPIRATION, JSON.stringify(response));

  //console.log("Data set to redis.");
  //console.log("Data set to redis: " + JSON.stringify(response));
}

function extendExpiration(id) {

  client.expire(id, DATA_EXPIRATION);
  console.log("Expiration extended.");

}

// create ID of object by sorting the values by key
function createID(data) {
  var sortedData = sortObj(data);
  var id = "";

  for (var property1 in sortedData) {
    if (typeof sortedData[property1] === 'object') {
      let temp = (sortedData[property1]);
      id += temp[Object.keys(temp)[0]];
    } else {
      id += sortedData[property1];
    }
    id += "_";
  }

  //remove the last underscore
  id = id.substring(0, id.length - 1);
  id = id.replace(" ", "_");
  return id;
}



// sort object by keys
function sortObj(obj) {
  return Object.keys(obj).sort().reduce((accumulator, currentValue) => {
    accumulator[currentValue] = obj[currentValue];
    return accumulator;
  }, {});
}

// this function tries to get data from redis. If failed, loads them from DB and stores them in redis. 
function requestData(db, parameters) {

  let id = createID(parameters);
  //console.log('created id: ' + id);

  return new Promise((resolve, reject) => {

    if (configVariables.redis) {

      //get data from redis
      client.get(id, function (err, data) {

        if (err) {
          //error
          reject(err);
        }

        if (data !== null && data !== 'undefined') {
          //data found in redis
          //console.log("Data found in redis!");

          //extend expiration
          //extendExpiration(id);

          //console.log(data);
          resolve(data);
        } else {
          //data not found in redis
          //console.log("Data NOT found in redis.");
          // the particular database query
          db.collection(COLLECTION).find(parameters).toArray(function (err, result) {
            //console.log("Requesting DB.");
            if (err) {
              //error
              reject(err);
            }
            //console.log("Data found in DB.");
            setDataToRedis(id, result);
            //console.log(result);
            resolve(result);
          });
        }
      });
    } else {

      db.collection(COLLECTION).find(parameters).toArray(function (err, result) {
        if (err) reject(err);
        //console.log(result);
        resolve(result);
      });

    }
  })


}

// this function tries to get data (count) from redis. If failed, loads them from DB and stores them in redis.
function requestDataCount(db, parameters) {

  let id = createID(parameters);

  id = id + "_count";
  //console.log('created id: ' + id);

  return new Promise((resolve, reject) => {

    if (configVariables.redis) {

      client.get(id, function (err, data) {
        if (err) {
          reject(err);
        }

        if (data !== null && data !== 'undefined') {
          //console.log("Data found in redis!");

          //extend expiration
          //extendExpiration(id);

          //console.log(data);
          resolve(data);
        } else {
          //console.log("Data NOT found in redis.");
          // the particular query
          db.collection(COLLECTION).find(parameters).count(function (err, result) {
            //console.log("Requesting DB.");
            if (err) {
              reject(err);
            }
            //console.log("Data found in DB.");
            setDataCountToRedis(id, result);
            //console.log(result);
            resolve(result);
          });
        }
      });
    } else {

      db.collection(COLLECTION).find(parameters).count(function (err, result) {
        //console.log("Requesting DB.");
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

module.exports.requestDataCount = requestDataCount;
module.exports.requestData = requestData;