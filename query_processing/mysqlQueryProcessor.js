const mysql = require('mysql');

const configVariables = require('../config-variables.js');

const cacheManager = require('./cacheManager.js');

var pool = mysql.createPool({
    host: "127.0.0.1",
    port: 3306,
    user: "root",
    //TODO: change pwd
    password: "mysql123",
    database: "projekt",
    connectionLimit: 50,
});

function createQuery(parameters, sql, page = 1) {

    //no parameters
    if (Object.entries(parameters).length === 0) {
        sql = sql.substring(0, sql.length - 7);
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

    let sql = "SELECT * FROM " + configVariables.TABLE_NAME + " WHERE ";
    sql = createQuery(parameters, sql, page);

    let id = createID(parameters, page);
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

function queryCount(parameters, res, url) {

    //console.log("______________________");

    let sql;

    if (configVariables.explain) {
        sql = "EXPLAIN SELECT * FROM " + configVariables.TABLE_NAME + " WHERE ";
    } else {
        sql = "SELECT COUNT(*) as count FROM " + configVariables.TABLE_NAME + " WHERE ";
    }
    sql = createQuery(parameters, sql);

    let id = createID(parameters);
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


// create ID of object by sorting the values by key
function createID(data, page = 1) {
    var sortedData = sortObj(data);
    //TODO: sort values as well!!!

    var id = "";

    for (var property1 in sortedData) {

        id += `${property1}:IN(${sortedData[property1]})`;

        /*if (typeof sortedData[property1] === 'object') {
            console.log("nn ");
            let temp = (sortedData[property1]);
            id += temp[Object.keys(temp)[0]];
        } else if (Array.isArray(sortedData[property1])) {
            console.log("array " + array);
            id += "IN("
            sortedData[property1].forEach(paramName => {
                console.log("paramName " + paramName);
                id += `${paramName},`
            });
            id += ")";
        }
        else {
            id += sortedData[property1];
        }*/
        id += configVariables.DELIMITER;
    }

    id = id.substring(0, id.length - 1);
    id = id.replace('%,', '');
    if (page) {
        id += configVariables.PAGE_DELIMITER + page;
    }

    //console.log("mysqlQueryProcessor: generated id: " + id);
    return id;
}

// sort object by keys
function sortObj(obj) {
    return Object.keys(obj).sort().reduce((accumulator, currentValue) => {
        accumulator[currentValue] = obj[currentValue];
        return accumulator;
    }, {});
}

module.exports.query = query;
module.exports.queryCount = queryCount;
module.exports.queryFulltext = queryFulltext;