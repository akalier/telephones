var mysql = require('mysql');
const config = require('./config.js');
const configVariables = require('./config-variables.js');
const databaseAccess = require('./database-access.js');

const cacheManager = require('./query_processing/cacheManager.js');

const CLASS_NAME = "MySQL Tester";

var pool = mysql.createPool({
    host: databaseAccess.IP,
    port: databaseAccess.PORT,
    user: databaseAccess.USERNAME,
    //TODO: change pwd
    password: databaseAccess.PASSWORD,
    database: databaseAccess.DATABASE,
    connectionLimit: 50,
});


pool.getConnection(function (err, connection) {
    if (err) {
        console.log(err);
        throw err;
    }
    console.log("Connected to mySQL!");

    cacheManager.flushCache();
    var time = new Date();

    config.performQueries().then(() => {
        var newTime = new Date();
        console.log("Total time: " + (newTime - time) / 1000);
        console.log("Closing database...");
        //database.close();
        connection.release();
        cacheManager.flushCache();
    }).catch((err) => {
        console.log(err);
    })

});


// create ID of object by sorting the values by key
function createID(data) {
    var sortedData = sortObj(data);
    var id = "";
    if (configVariables.explain) {
        id += configVariables.EXPLAIN_DELIMITER;
    }

    for (var property1 in sortedData) {
        if (typeof sortedData[property1] === 'object') {
            let temp = (sortedData[property1]);
            id += temp[Object.keys(temp)[0]];
        } else {
            id += sortedData[property1];
        }
        id += configVariables.DELIMITER;
    }

    id = id.substring(0, id.length - 1);
    id = id.replace(" ", configVariables.DELIMITER);
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

    let sql = "SELECT * FROM " + configVariables.TABLE_NAME + " WHERE ";
    sql = createQuery(parameters, sql);
    //console.log("generated sql: " + sql);

    let id = createID(parameters);

    return new Promise((resolve, reject) => {
        if (configVariables.useCache) {

            let cachePromise = cacheManager.searchInCache(id);

            cachePromise.then((data) => {

                if (data !== null && data !== 'undefined') {
                    //console.log("Data found in redis!");
                    //console.log(data);
                    resolve(data);
                } else {
                    //console.log("Data NOT found in redis.");
                    // the particular query

                    //get mysql connection
                    pool.getConnection(function (err, con) {
                        if (err) {
                            console.log("mysqlQueryProcessor: " + err);
                            throw err;
                        }
                        con.query(sql, function (err, result, fields) {
                            if (err) {
                                reject(err);
                            }

                            cacheManager.setDataToCache(id, result);

                            //console.log("Data found in DB.");
                            //console.log(result);

                            con.release();
                            resolve(result);
                        });
                    });
                }
            });
        } else {

            pool.getConnection(function (err, con) {
                if (err) {
                    console.log("mysqlQueryProcessor: " + err);
                    throw err;
                }
                con.query(sql, function (err, result, fields) {
                    if (err) {
                        reject(err);
                    }
                    //console.log("Data found in DB.");
                    //console.log(result);

                    con.release();
                    resolve(result);
                });
            });

        }
    })

}

// this function tries to get data (count) from redis. If failed, loads them from DB.
function requestDataCount(parameters) {

    let sql;

    if (configVariables.explain) {
        //console.log("WARNING: using explain");
        sql = "EXPLAIN SELECT * FROM " + configVariables.TABLE_NAME + " WHERE ";
    } else {
        sql = "SELECT COUNT(*) as count FROM " + configVariables.TABLE_NAME + " WHERE ";
    }

    sql = createQuery(parameters, sql);
    //console.log("generated sql: " + sql);

    let id = createID(parameters);
    id = id + configVariables.COUNT_DELIMITER;
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
                    pool.getConnection(function (err, con) {
                        if (err) {
                            console.log("mysqlQueryProcessor: " + err);
                            throw err;
                        }
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

                            con.release();

                            //console.log(vysledek);
                            cacheManager.setDataToCache(id, vysledek);
                            resolve(vysledek);
                        });
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