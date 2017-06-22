const config = require('./database_config.js');
const pg = require('pg');

const pool = new pg.Pool(config);

function setQuery (text, values, callback) {
  console.log('query:', text, values);
  return pool.query(text, values, callback);
};

module.exports = setQuery;