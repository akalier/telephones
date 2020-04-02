var mysql = require('mysql');
const configVariables = require('./config-variables.js');

const cacheManager = require('./query_processing/cacheManager.js');

const redis = require('redis');

const REDIS_PORT = 6379;
const client = redis.createClient(REDIS_PORT);

var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    //TODO: change pwd
    password: "mysql123",
    database: "projekt"
});

con.connect(function (err) {
    if (err) {
        console.log(err);
        throw err;
    }
    console.log("Connected to mySQL!");
    recacheKeys();
  
});


function recacheKeys() {
    let sql = "SELECT * FROM logs WHERE count > 1";

    return new Promise((resolve, reject) => {
        con.query(sql, function (err, result, fields) {
            if (err) {
                reject(err);
            }

            for (var i = 0; i < result.length; i++) {
                console.log(result[i].hash);
                reparse(result[i].hash);
            }

            resolve(result);
        });
    });

}

function reparse(hash) {

    let originalHash = hash;

    let page = 1;
    if (hash.includes("page")) {
        let split = hash.split("$$$page:");
        page = parseInt(split[1]);
        hash = split[0];
    }

    let sql;

    if (hash.includes("fulltext")) {
        let split = hash.split("fulltext$");
        hash = split[1];
        sql = makeFulltextQuery(hash, page);
    } else {
        sql = makeNormalQuery(hash, page);
    }

    return new Promise((resolve, reject) => {
        con.query(sql, function (err, result, fields) {
            if (err) {
                reject(err);
            }

            cacheManager.setDataToRedis(originalHash, result);
            //console.log(result);
            resolve(result);
        });
    });

}

function makeFulltextQuery(hash, page) {

    let sql = `SELECT * FROM ${configVariables.TABLE_NAME} WHERE vyrobce LIKE '%${hash}%' OR konstrukce LIKE '%${hash}%' OR OS LIKE '%${hash}%' OR uzivatelska_pamet LIKE '%${hash}%' OR fotoaparat_mpix LIKE '%${hash}%' OR bluetooth LIKE '%${hash}%'`;
    sql += ` LIMIT ${((page-1)*configVariables.ROWS_PER_PAGE)}, ${configVariables.ROWS_PER_PAGE}`;

    console.log(sql);
    return sql;
}

function makeNormalQuery(hash, page) {

    let sql = `SELECT * FROM ${configVariables.TABLE_NAME} WHERE `;

    let split = hash.split("$");

    for (s of split) {
        let split2 = s.split(":");
        let params = split2[1].replace("IN(", "");
        params = params.replace(")", "");
        params = params.split(",");
        sql += "(";
        for (param of params) {
            sql += split2[0];
            if (!isNaN(param) && param.includes(".")) {
                sql += ` LIKE '${param}%' `
            } else {
                sql += ` = '${param}' `
            }
            sql += " OR "      
        }
        sql = sql.substring(0, sql.length - 4);
        sql += ") AND "
    }

    sql = sql.substring(0, sql.length - 4);
    sql += ` LIMIT ${((page-1)*configVariables.ROWS_PER_PAGE)}, ${configVariables.ROWS_PER_PAGE}`;
    console.log(sql);

    return sql;
}