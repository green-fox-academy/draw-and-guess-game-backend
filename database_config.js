require('dotenv').config()

const config = {
  user: process.env.user,
  database: process.env.database,
  password: process.env.password, 
  host: process.env.host, 
  port: process.env.DATAPORT,
  max: 10, 
  idleTimeoutMillis: 30000,
};


module.exports = config;