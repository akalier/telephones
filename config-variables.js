/* CONFIG HERE */

//mySQL/mongoDB
const database = "mySQL";

//redis
const cache = "redis"

// All data (false) vs Count (true)
const count = false;

// values 0, 50, 80, 100. If count is false, then only 0 or 50
const percent = 0;

const useCache = false;
if (useCache) {
    console.log("Config variables: using Redis");
} else {
    console.log("Config variables: NOT using Redis");
}

const explain = false;

const ROWS_PER_PAGE = 10;
const TABLE_NAME = 'telefon';
const DATA_EXPIRATION = 3600;

const REDIS_PORT = 6379;

//parsing
const DELIMITER = '$';
const PAGE_DELIMITER = '$$$';
const COUNT_DELIMITER = '$page:';
const EXPLAIN_DELIMITER = 'EXPLAIN$';
const FULLTEXT_DELIMITER = 'fulltext$';

const LOGS_MINIMUM_COUNT = 1;

/* END OF CONFIG HERE */

module.exports.count = count;
module.exports.percent = percent;
module.exports.useCache = useCache;
module.exports.explain = explain;
module.exports.database = database;
module.exports.TABLE_NAME = TABLE_NAME;
module.exports.DATA_EXPIRATION = DATA_EXPIRATION;
module.exports.ROWS_PER_PAGE = ROWS_PER_PAGE;
module.exports.cache = cache;
module.exports.REDIS_PORT = REDIS_PORT;
module.exports.DELIMITER = DELIMITER;
module.exports.PAGE_DELIMITER = PAGE_DELIMITER;
module.exports.COUNT_DELIMITER = COUNT_DELIMITER;
module.exports.EXPLAIN_DELIMITER = EXPLAIN_DELIMITER;
module.exports.FULLTEXT_DELIMITER = FULLTEXT_DELIMITER;
module.exports.LOGS_MINIMUM_COUNT = LOGS_MINIMUM_COUNT;