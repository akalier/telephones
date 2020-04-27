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
        console.log(CLASS_NAME + ": " + err);
        throw err;
    }
    console.log(CLASS_NAME + ": " + "Connected to mySQL!");

    cacheManager.flushCache();
    var time = new Date();

    config.performQueries().then(() => {
        var newTime = new Date();
        console.log(CLASS_NAME + ": " + "Total time: " + (newTime - time) / 1000);
        console.log(CLASS_NAME + ": " + "Closing database...");
        //database.close();
        connection.release();
        cacheManager.flushCache();
    }).catch((err) => {
        console.log(CLASS_NAME + ": " + err);
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
    //console.log(CLASS_NAME + ": " + "generated sql: " + sql);

    let id = createID(parameters);

    return new Promise((resolve, reject) => {
        if (configVariables.useCache) {

            let cachePromise = cacheManager.searchInCache(id);

            cachePromise.then((data) => {

                if (data !== null && data !== 'undefined') {
                    //console.log(CLASS_NAME + ": " + "Data found in redis!");
                    //console.log(data);
                    resolve(data);
                } else {
                    //console.log(CLASS_NAME + ": " + "Data NOT found in redis.");
                    // the particular query

                    //get mysql connection
                    pool.getConnection(function (err, con) {
                        if (err) {
                            console.log(CLASS_NAME + ": " + err);
                            throw err;
                        }
                        con.query(sql, function (err, result, fields) {
                            if (err) {
                                reject(err);
                            }

                            cacheManager.setDataToCache(id, result);

                            //console.log(CLASS_NAME + ": " + "Data found in DB.");
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
                    console.log(CLASS_NAME + ": " + err);
                    throw err;
                }
                con.query(sql, function (err, result, fields) {
                    if (err) {
                        reject(err);
                    }
                    //console.log(CLASS_NAME + ": " + "Data found in DB without looking to cache.");
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
        //console.log(CLASS_NAME + ": " + "WARNING: using explain");
        sql = "EXPLAIN SELECT * FROM " + configVariables.TABLE_NAME + " WHERE ";
    } else {
        sql = "SELECT COUNT(*) as count FROM " + configVariables.TABLE_NAME + " WHERE ";
    }

    sql = createQuery(parameters, sql);
    //console.log(CLASS_NAME + ": " + "generated sql: " + sql);

    let id = createID(parameters);
    id = id + configVariables.COUNT_DELIMITER;
    //console.log(CLASS_NAME + ": " + "generated id: " + id);

    return new Promise((resolve, reject) => {
        if (configVariables.useCache) {

            let cachePromise = cacheManager.searchInCache(id);

            cachePromise.then((data) => {

                if (data !== null && data !== 'undefined') {
                    //console.log(CLASS_NAME + ": " + "Data found in redis!");
                    //console.log(data);
                    resolve(data);
                } else {
                    //console.log(CLASS_NAME + ": " + "Data NOT found in redis.");
                    // the particular query
                    pool.getConnection(function (err, con) {
                        if (err) {
                            console.log(CLASS_NAME + ": " + err);
                            throw err;
                        }
                        con.query(sql, function (err, result, fields) {
                            if (err) {
                                reject(err);
                            }
                            //console.log(CLASS_NAME + ": " + "Data found in DB.");

                            var vysledek;
                            if (configVariables.explain) {
                                if (result[0].filtered <= 0) {
                                    result[0].filtered = 0.001;
                                }
                                //console.log(CLASS_NAME + ": " + "rows: " + result[0].rows);
                                //console.log(CLASS_NAME + ": " + "filtered: " + result[0].filtered);
                                //console.log(CLASS_NAME + ": " + (result[0].rows) + " / (100 / " + result[0].filtered + ")");
                                vysledek = (result[0].rows) / (100 / result[0].filtered);
                            } else {
                                vysledek = result[0].count;
                            }

                            con.release();

                            //console.log(CLASS_NAME + ": " + vysledek);
                            cacheManager.setDataToCache(id, vysledek);
                            resolve(vysledek);
                        });
                    });
                }

            })

        } else {

            pool.getConnection(function (err, con) {
                if (err) {
                    console.log(CLASS_NAME + ": " + err);
                    throw err;
                }
                con.query(sql, function (err, result, fields) {
                    if (err) {
                        reject(err);
                    }
                    //console.log(CLASS_NAME + ": " + "Data found in DB.");

                    var vysledek;
                    if (configVariables.explain) {
                        if (result[0].filtered <= 0) {
                            result[0].filtered = 0.001;
                        }
                        //console.log(CLASS_NAME + ": " + "rows: " + result[0].rows);
                        //console.log(CLASS_NAME + ": " + "filtered: " + result[0].filtered);
                        //console.log(CLASS_NAME + ": " + (result[0].rows) + " / (100 / " + result[0].filtered + ")");
                        vysledek = (result[0].rows) / (100 / result[0].filtered);
                    } else {
                        vysledek = result[0].count;
                    }

                    con.release();
                    //console.log(CLASS_NAME + ": " + vysledek);
                    resolve(vysledek);
                });
            });

        }
    })

}

module.exports.requestDataCount = requestDataCount;
module.exports.requestData = requestData;