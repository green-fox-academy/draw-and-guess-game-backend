'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const pg = require('pg');
const jwt = require('jsonwebtoken');
require('dotenv').config()

const app = express();

app.use(cors());
app.use(bodyParser.json());

const config = {
  user: process.env.user,
  database: process.env.database,
  password: process.env.password, 
  host: process.env.host, 
  port: process.env.DATAPORT, 
  max: 10, 
  idleTimeoutMillis: 30000,
};

const pool = new pg.Pool(config);
const table = process.env.TABLE;
const secretKey = process.env.KEY;


module.exports.query = function (text, values, callback) {
  console.log('query:', text, values);
  return pool.query(text, values, callback);
};

app.post('/login', function(req,res) {
	const userName = req.body.user;
	const pass = req.body.pass;

	pool.query('SELECT passwords FROM ' + table + ' WHERE user_name = $1', [userName], function(err, result) {
		if(err) {
			res.json({
				"error": err.message
			});
		} else {
			if(!result.rows[0]){
				res.json({
					"status": "error", "message": "Wrong username or password."
				})
			} else if(result.rows[0].passwords === pass){
				let token = jwt.sign({"user": userName, "password": pass}, secretKey);
				res.json({
					success: true,
					token: token
				})
			} else {
				res.json({
					"status": "error", "message": "Wrong username or password."
				})
			}
		}
	});
})


app.post('/register', function(req,res) {
	const userName = req.body.user;
	const pass = req.body.pass;


	pool.query('SELECT user_name FROM ' + table + ' WHERE user_name = $1', [userName], function(err, result) {
		if(err) {
			res.json({
				"error": err.message
			});
		} else {
			if(!result.rows[0]) {
				pool.query('INSERT INTO ' + table + ' (passwords, user_name) VALUES( $1, $2);', [pass ,userName], function(err, result) {
					if(err) {
						res.json({
							"error": err.message
						});
					} else {
						let token = jwt.sign({"user": userName, "password": pass}, secretKey);
						res.json({
							success: true,
							token: token
						})
					}
				});
			} else {
				res.json({
					"status": "error", 
					"message": "Username is already taken."
				})
			}
		}
	});
})

//////////////////////////////////////////
app.post('/protected', function(req,res) {
	const token = req.body.token;

	jwt.verify(token, secretKey, function(err, decoded) {
		if(err) {
			res.status(401).json({
				"status": "error",
				"message": "Failed to authenticate"
			});
			//middlewear
		} else {
			if(decoded === undefined) {
				res.status(404).json({
					"status": "error",
					"message": "No such user"
				});
			} else {
				res.status(200).json({
					"status": "allowed",
					"message": decoded.user
				});
			}
		}
	});
})

app.listen(process.env.PORT);