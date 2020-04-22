const mysql = require('./mysqlQueryProcessor.js');

function query(parameters, res, url) {
    mysql.query(parameters, res, url);
}

function queryCount(parameters, res, url) {
    mysql.queryCount(parameters, res, url);
}

module.exports.query = query;
module.exports.queryCount = queryCount;