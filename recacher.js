var mysql = require('mysql');
const configVariables = require('./config-variables.js');

const cacheManager = require('./query_processing/cacheManager.js');

const CLASS_NAME = "Recacher";

var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    //TODO: change pwd
    password: "mysql123",
    database: "projekt"
});

con.connect(function (err) {
    if (err) {
        console.log(CLASS_NAME + ": " + err);
        throw err;
    }
    console.log(CLASS_NAME + ": " + "Connected to mySQL!");
    recacheKeys();
  
});


function recacheKeys() {
    let sql = "SELECT * FROM logs WHERE count >= " + configVariables.LOGS_MINIMUM_COUNT;

    return new Promise((resolve, reject) => {
        con.query(sql, function (err, result, fields) {
            if (err) {
                reject(err);
            }

            for (var i = 0; i < result.length; i++) {
                //console.log(CLASS_NAME + ": " + result[i].hash);
                reparse(result[i].hash);
            }

            resolve(result);
        });
    });

}

function reparse(hash) {

    let originalHash = hash;

    let page = 1;
    if (hash.includes(configVariables.PAGE_DELIMITER)) {
        let split = hash.split(configVariables.PAGE_DELIMITER);
        page = parseInt(split[1]);
        hash = split[0];
    }

    let sql = `SELECT * FROM ${configVariables.TABLE_NAME} WHERE `;

    if (hash.includes(configVariables.FULLTEXT_DELIMITER)) {
        let split = hash.split(configVariables.FULLTEXT_DELIMITER);
        rest = split[1];
        fulltext = rest.split(configVariables.DELIMITER)[0];

        sql += makeFulltextQuerySQLPart(fulltext);
        if (rest.split(configVariables.DELIMITER)[1]) {
            hash = hash.replace(configVariables.FULLTEXT_DELIMITER, "");
            hash = hash.replace(fulltext, "");
            hash = hash.replace(configVariables.DELIMITER, "");
            sql += " AND ";
            sql += makeNormalQuery(hash, page);
        } else {
            sql += ` LIMIT ${((page-1)*configVariables.ROWS_PER_PAGE)}, ${configVariables.ROWS_PER_PAGE}`;
        }
    } else {
        sql += makeNormalQuery(hash, page);
    }

    console.log(CLASS_NAME + ": " + "whole query: " + sql);

    return new Promise((resolve, reject) => {
        con.query(sql, function (err, result, fields) {
            if (err) {
                reject(err);
            }

            cacheManager.setDataToRedis(originalHash, result);
            //console.log(CLASS_NAME + ": " + result);
            resolve(result);
        });
    });

}

function makeFulltextQuerySQLPart(hash) {

    let sql = ` (vyrobce LIKE '%${hash}%' OR konstrukce LIKE '%${hash}%' OR OS LIKE '%${hash}%' OR uzivatelska_pamet LIKE '%${hash}%' OR fotoaparat_mpix LIKE '%${hash}%' OR bluetooth LIKE '%${hash}%')`;

    //console.log(CLASS_NAME + ": " + "fulltext part: " + sql);
    return sql;
}

function makeNormalQuery(hash, page) {

    let sql = "";

    let split = hash.split(configVariables.DELIMITER);

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
    //console.log(CLASS_NAME + ": " + sql);

    return sql;
}