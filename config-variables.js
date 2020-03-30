/* CONFIG HERE */

//mySQL or mongoDB
const database = "mySQL";

// All data (false) vs Count (true)
const count = true;

// values 0, 50, 80, 100. If count is false, then only 0 or 50
const percent = 100;

const redis = true;
if (redis) {
    console.log("Config variables: using Redis");
} else {
    console.log("Config variables: NOT using Redis");
}

const explain = true;

const ROWS_PER_PAGE = 10;
const TABLE_NAME = 'telefon';
const DATA_EXPIRATION = 3600;

/* END OF CONFIG HERE */

module.exports.count = count;
module.exports.percent = percent;
module.exports.redis = redis;
module.exports.explain = explain;
module.exports.database = database;
module.exports.TABLE_NAME = TABLE_NAME;
module.exports.DATA_EXPIRATION = DATA_EXPIRATION;
module.exports.ROWS_PER_PAGE = ROWS_PER_PAGE;