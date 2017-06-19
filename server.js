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
const roomTable = process.env.ROOM_TABLE;

const secretKey = process.env.KEY;
let actualUserName;

module.exports.query = function (text, values, callback) {
  console.log('query:', text, values);
  return pool.query(text, values, callback);
};



const authenticated = express.Router(); 

authenticated.use(function(req, res, next) {
  let token = req.headers['auth'];
  if (token) {
    jwt.verify(token, secretKey, function(err, decoded) {      
      if (err) {
        return res.status(401).json({ "status": "error", "message": "Authentication required" });    
      } else {
        actualUserName = decoded.user;
        next();
      }
    });
  } else {
    return res.status(401).json({ "status": "error", "message": "Authentication required" });
  }
});

app.use('/room', authenticated);




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
          token: token,
          user: userName
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
              token: token,
              user: userName
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

app.post('/room', function(req,res) {
  const roomName = req.body.name;

  pool.query('INSERT INTO ' + roomTable + ' (name, owner) VALUES( $1, $2) RETURNING *;', [roomName , actualUserName], function(err, result) {
    if(err){
      console.log(result);
      res.json(
        { "status": "error", "message": "Could not create the room" }
      )
    } else {
      let createdRoom = JSON.parse(JSON.stringify(result.rows[0]));
      res.json({
      "status": "ok",
      "room": createdRoom 
      })
    }
  })
})

app.get('/room/:id', function(req,res) {
  const roomID = req.params.id;

  pool.query('SELECT * FROM ' + roomTable + ' WHERE id = $1', [roomID], function(err, result) {
    if(!result.rows[0]){
      res.json(
        { "status": "error", "message": "Room with the given id was not found" }
      )
    } else {
      let selectedRoom = JSON.parse(JSON.stringify(result.rows[0]));
      res.json( selectedRoom );
    }
  })
})

app.get('/room', function(req,res) {

  pool.query('SELECT * FROM ' + roomTable, function(err, result) {
    if(err){
      res.json(
        { "status": "error" }
      )
    } else {
      let rooms = JSON.parse(JSON.stringify(result.rows));
      res.json( rooms );
    }
  })
})

app.listen(process.env.PORT, function(){
  console.log('Server is running, Port: ' + process.env.PORT);
});

module.exports = app;