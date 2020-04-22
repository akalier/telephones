const mysql = require('./mysqlQueryProcessor.js');

const CLASS_NAME = "Query Processor";

function query(parameters, res, url) {
    mysql.query(parameters, res, url);
}

function queryCount(parameters, res, url) {
    mysql.queryCount(parameters, res, url);
}

module.exports.query = query;
module.exports.queryCount = queryCount;