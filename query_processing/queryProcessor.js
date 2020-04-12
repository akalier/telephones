const mysql = require('./mysqlQueryProcessor.js');
const mongo = require('./mongoQueryProcessor.js');

const CURRENT_DATABASE = "mySQL";
//const CURRENT_DATABASE = "mongoDB";

var database;

if (CURRENT_DATABASE === "mySQL") {
    
    console.log("Query processor: using mySQL database.")
    database = mysql;

} else {

    console.log("Query processor: using mongoDB.")
    database = mongo;

}

function query(parameters, res, url) {
    database.query(parameters, res, url);
}

function queryCount(parameters, res, url) {
    database.queryCount(parameters, res, url);
}

module.exports.query = query;
module.exports.queryCount = queryCount;