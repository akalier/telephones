const mysql = require('mysql');

const configVariables = require('../config-variables.js');
const databaseAccess = require('../database-access.js');

const cacheManager = require('./cacheManager.js');

var pool = mysql.createPool({
    host: databaseAccess.IP,
    port: databaseAccess.PORT,
    user: databaseAccess.USERNAME,
    //TODO: change pwd
    password: databaseAccess.PASSWORD,
    database: databaseAccess.DATABASE,
    connectionLimit: 50,
});

function createQuery(parameters, sql, page = 1, fulltext = false) {

    //no parameters
    if (Object.entries(parameters).length === 0) {
        if (fulltext) {
            sql = sql.substring(0, sql.length - 5);
        } else {
            sql = sql.substring(0, sql.length - 7);
        }

        sql += ` LIMIT ${((page - 1) * configVariables.ROWS_PER_PAGE)}, ${configVariables.ROWS_PER_PAGE}`;

        //console.log("mysqlQueryProcessor (generated query without params): " + sql);
        return sql;
    }

    for (var propertyName in parameters) {

        if (Array.isArray(parameters[propertyName])) {
            //there is an array of parameters (e.g. multiple brands)
            var numbers = false;

            //are there any numbers in the values?
            parameters[propertyName].forEach(paramName => {
                if (!isNaN(paramName)) {
                    numbers = true;
                }
            });

            if (numbers) {

                sql += '(';

                parameters[propertyName].forEach(paramName => {
                    if (paramName !== '%') {
                        sql += `${propertyName} LIKE ${paramName} OR `;
                    }
                });

                sql = sql.substring(0, sql.length - 4);
                sql += ') AND ';

            } else {

                sql += `${propertyName} IN (`;
                parameters[propertyName].forEach(paramName => {
                    if (paramName !== '%') {
                        sql += `'${paramName}', `
                    }
                });
                sql = sql.substring(0, sql.length - 2);
                sql += ") AND ";

            }

        } else {
            //single parameter
            sql += `${propertyName} LIKE '${parameters[propertyName]}' AND `;
        }
    }

    sql = sql.substring(0, sql.length - 4);

    //limit

    sql += ` LIMIT ${((page - 1) * configVariables.ROWS_PER_PAGE)}, ${configVariables.ROWS_PER_PAGE}`;

    //console.log("mysqlQueryProcessor (generated query): " + sql);
    return sql;
}

function query(parameters, res, url) {

    //console.log("______________________");

    let page = 1;
    if (parameters.page != null) {
        page = parameters.page;
        delete parameters.page;
    }

    let searchString = "";
    if (parameters.searchString != null) {
        searchString = parameters.searchString;
        delete parameters.searchString;
    }

    let sql = "SELECT * FROM " + configVariables.TABLE_NAME + " WHERE ";
    if (searchString !== "") {
        sql += `(vyrobce LIKE '%${searchString}%' OR konstrukce LIKE '%${searchString}%' OR OS LIKE '%${searchString}%' OR uzivatelska_pamet LIKE '%${searchString}%' OR fotoaparat_mpix LIKE '%${searchString}%' OR bluetooth LIKE '%${searchString}%') AND `;
        sql = createQuery(parameters, sql, page, true);
    } else {
        sql = createQuery(parameters, sql, page, false);
    }

    //console.log(sql);

    let id;
    if (searchString !== "") {
        id = cacheManager.createID(parameters, page, searchString);
    } else {
        id = cacheManager.createID(parameters, page);
    }

    logQuery(id);
    console.log(id);

    //get total count for pagination
    paginationCount(parameters).then((totalCount) => {

        let cachePromise = cacheManager.searchInCache(id);

        cachePromise.then((data) => {
            if (data !== null && data !== 'undefined') {
                console.log("mysqlQueryProcessor: Data found in redis!");

                //extendExpiration(id);

                //console.log("mysqlQueryProcessor (redis data): " + data);

                if (page > 1) {
                    prevPage = page - 1;
                } else {
                    prevPage = page;
                }

                if (page * configVariables.ROWS_PER_PAGE > totalCount) {
                    nextPage = page;
                } else {
                    nextPage = page + 1;
                }

                res.render('results', {
                    title: "Výsledky vyhledávání",
                    telephones: JSON.parse(data),
                    nextPage: nextPage,
                    prevPage: prevPage,
                    url: url
                });
                return;
            } else {
                console.log("mysqlQueryProcessor: Data NOT found in cache.");

                //get mysql connection
                pool.getConnection(function (err, con) {
                    if (err) {
                        console.log("mysqlQueryProcessor: " + err);
                        throw err;
                    }

                    con.query(sql, function (err, result, fields) {
                        if (err) {
                            throw err;
                        }
                        //console.log("mysqlQueryProcessor: Data found in DB.");
                        //console.log(result);

                        //console.log("mysqlQueryProcessor (mysql data): " + result);

                        cacheManager.setDataToCache(id, result);

                        if (page > 1) {
                            prevPage = page - 1;
                        } else {
                            prevPage = page;
                        }

                        if (page * configVariables.ROWS_PER_PAGE > totalCount) {
                            nextPage = page;
                        } else {
                            nextPage = page + 1;
                        }

                        res.render('results', {
                            title: "Výsledky vyhledávání",
                            telephones: result,
                            nextPage: nextPage,
                            prevPage: prevPage,
                            url: url
                        });
                        con.release();
                        return;
                    });
                })
            };
        });

    });


}

function paginationCount(parameters) {

    let sql = "SELECT COUNT(*) as count FROM " + configVariables.TABLE_NAME + " WHERE ";

    sql = createQuery(parameters, sql);

    let id = cacheManager.createID(parameters);
    id = id + configVariables.COUNT_DELIMITER;
    //logQuery(id);

    return new Promise(function (resolve, reject) {

        let cachePromise = cacheManager.searchInCache(id);

        cachePromise.then((data) => {

            if (data !== null && data !== 'undefined') {

                resolve([JSON.parse(data)]);

            } else {

                pool.getConnection(function (err, con) {

                    if (err) {
                        console.log("mysqlQueryProcessor: " + err);
                        throw err;
                    }

                    con.query(sql, function (err, result, fields) {
                        if (err) {
                            console.log("mysqlQueryProcessor: " + err);
                            throw err;
                        }

                        cacheManager.setDataCountToCache(id, result[0].count);

                        con.release();

                        resolve([JSON.parse(result[0].count)]);

                    });
                })
            };

        });

    });

}

function queryCount(parameters, res, url) {

    //console.log("______________________");

    let sql;

    if (configVariables.explain) {
        sql = "EXPLAIN SELECT * FROM " + configVariables.TABLE_NAME + " WHERE ";
    } else {
        sql = "SELECT COUNT(*) as count FROM " + configVariables.TABLE_NAME + " WHERE ";
    }
    sql = createQuery(parameters, sql);

    let id = cacheManager.createID(parameters);
    id = id + configVariables.COUNT_DELIMITER;
    //logQuery(id);

    let cachePromise = cacheManager.searchInCache(id);

    cachePromise.then((data) => {

        if (data !== null && data !== 'undefined') {
            //console.log("mysqlQueryProcessor: Data found in redis!");

            //extendExpiration(id);

            //console.log("mysqlQueryProcessor (redis data): " + data);

            res.send([JSON.parse(data)]);
            return;
        } else {
            //console.log("mysqlQueryProcessor: Data NOT found in cache.");
            //get mysql connection
            pool.getConnection(function (err, con) {

                //console.log("mysqlQueryProcessor: connection established.");

                if (err) {
                    console.log("mysqlQueryProcessor: " + err);
                    throw err;
                }

                con.query(sql, function (err, result, fields) {
                    if (err) {
                        console.log("mysqlQueryProcessor: " + err);
                        throw err;
                    }
                    //console.log("mysqlQueryProcessor: Data found in DB.");
                    //console.log("mysqlQueryProcessor (mysql data): " + result[0].count);

                    cacheManager.setDataCountToCache(id, result[0].count);
                    res.send([JSON.parse(result[0].count)]);
                    con.release();
                    return;
                });
            })
        };

    });

}

function queryFulltext(searchString, page, res, url) {
    let sql = `SELECT * FROM ${configVariables.TABLE_NAME} WHERE vyrobce LIKE '%${searchString}%' OR konstrukce LIKE '%${searchString}%' OR OS LIKE '%${searchString}%' OR uzivatelska_pamet LIKE '%${searchString}%' OR fotoaparat_mpix LIKE '%${searchString}%' OR bluetooth LIKE '%${searchString}%'`;
    sql += ` LIMIT ${((page - 1) * configVariables.ROWS_PER_PAGE)}, ${configVariables.ROWS_PER_PAGE}`;

    let id = configVariables.FULLTEXT_DELIMITER + searchString;
    logQuery(id);

    let cachePromise = cacheManager.searchInCache(id);

    cachePromise.then((data) => {

        if (data !== null && data !== 'undefined') {
            console.log("mysqlQueryProcessor: Data found in redis!");

            //extendExpiration(id);

            //console.log("mysqlQueryProcessor (redis data): " + data);

            if (page > 1) {
                prevPage = page - 1;
            } else {
                prevPage = page;
            }

            res.render('results', {
                title: "Výsledky vyhledávání",
                telephones: JSON.parse(data),
                nextPage: page + 1,
                prevPage: prevPage,
                url: url
            });
            return;
        } else {
            console.log("mysqlQueryProcessor: Data NOT found in cache.");

            //get mysql connection
            pool.getConnection(function (err, con) {
                if (err) {
                    console.log("mysqlQueryProcessor: " + err);
                    throw err;
                }

                con.query(sql, function (err, result, fields) {
                    if (err) {
                        throw err;
                    }
                    //console.log("mysqlQueryProcessor: Data found in DB.");
                    //console.log(result);

                    //console.log("mysqlQueryProcessor (mysql data): " + result);

                    cacheManager.setDataToCache(id, result);

                    if (page > 1) {
                        prevPage = page - 1;
                    } else {
                        prevPage = page;
                    }

                    res.render('results', {
                        title: "Výsledky vyhledávání",
                        telephones: result,
                        nextPage: page + 1,
                        prevPage: prevPage,
                        url: url
                    });
                    con.release();
                    return;
                });
            })
        };

    });
}

function logQuery(hash) {

    let sql = `INSERT INTO logs (hash, count, date) VALUES("${hash}", 1, NOW()) ON DUPLICATE KEY UPDATE count=count+1, date=NOW()`

    pool.getConnection(function (err, con) {
        if (err) {
            throw err;
        }
        con.query(sql, function (err, result, fields) {
            if (err) {
                throw err;
            } else {
                console.log("mysqlQueryProcessor: Updated log.");
            }
            con.release();
            return;
        });
    });

}

module.exports.query = query;
module.exports.queryCount = queryCount;
module.exports.queryFulltext = queryFulltext;