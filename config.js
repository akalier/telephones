const configVariables = require('./config-variables.js');

var performQueries;

if (configVariables.database == 'mySQL') {

    if (configVariables.count) {

        if (configVariables.percent === 0) {
            const mysqlselectc = require('./in_codes/mySQLselectc.js');
            performQueries = mysqlselectc.mysqlSelectCount0;
            console.log("Config: Executing mySQL COUNT with 0%.");
        } else if (configVariables.percent === 50) {
            const mysqlselect50c = require('./in_codes/mySQLselect50c.js');
            performQueries = mysqlselect50c.mysqlSelectCount50;
            console.log("Config: Executing mySQL COUNT with 50%.");
        } else if (configVariables.percent === 80) {
            const mysqlselect80c = require('./in_codes/mySQLselect80c.js');
            performQueries = mysqlselect80c.mysqlSelectCount80;
            console.log("Config: Executing mySQL COUNT with 80%.");
        } else {
            const mysqlselect100c = require('./in_codes/mySQLselect100c.js');
            performQueries = mysqlselect100c.mysqlSelectCount100;
            console.log("Config: Executing mySQL COUNT with 100%.");
        }

    } else {
        if (configVariables.percent === 0) {
            const mysqlselect = require('./in_codes/mySQLselect.js');
            performQueries = mysqlselect.mysqlSelect0;
            console.log("Config: Executing mySQL ALL with 0%.");
        } else {
            const mysqlselect50 = require('./in_codes/mySQLselect50.js');
            performQueries = mysqlselect50.mysqlSelect50;
            console.log("Config: Executing mySQL ALL with 50%.");
        }
    }

} else {

    if (configVariables.count) {

        if (configVariables.percent === 0) {
            const mongodbselectc = require('./in_codes/mongoDBselectc.js');
            performQueries = mongodbselectc.mongoSelectCount0;
            console.log("Config: Executing mongoDB COUNT with 0%.");
        } else {
            const mongodbselect50c = require('./in_codes/mongoDBselect50c.js');
            performQueries = mongodbselect50c.mongoSelectCount50;
            console.log("Config: Executing mongoDB COUNT with 50%.");
        }

    } else {
        if (configVariables.percent === 0) {
            const mongodbselect = require('./in_codes/mongoDBselect.js');
            performQueries = mongodbselect.mongoSelect0;
            console.log("Config: Executing mongoDB ALL with 0%.");
        } else {
            const mongodbselect50 = require('./in_codes/mongoDBselect50.js');
            performQueries = mongodbselect50.mongoSelect50;
            console.log("Config: Executing mongoDB ALL with 50%.");
        }
    }

}

module.exports.performQueries = performQueries;