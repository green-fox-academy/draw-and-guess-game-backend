'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const pg = require('pg');
const jwt = require('jsonwebtoken');
const passwordHash = require('password-hash');
const config = require('./database_config.js');
const authentication = require('./authentication.js');
const querySettings = require('./database_query_settings.js');

require('dotenv').config()

const app = express();
app.use(cors());
app.use(bodyParser.json());

const table = process.env.TABLE;
const roomTable = process.env.ROOM_TABLE;
const secretKey = process.env.KEY;

const pool = new pg.Pool(config);
module.exports.query = querySettings;

app.use('/room', authentication);

app.post('/login', loginPost);
app.post('/register', registerPost);
app.post('/room', postNewRoom);

app.get('/room/:id', getOneRoom);
app.get('/room', getAllRoom);

function loginPost(req,res) {
  const userName = req.body.user;
  const pass = req.body.pass;
  const passOrUserError = { "status": "error", "message": "Wrong username or password." }

  pool.query('SELECT passwords FROM ' + table + ' WHERE user_name = $1', [userName], function(err, result) {
    if(err) {
      res.json({
        "error": err.message
      });
    } else {
      if(!result.rows[0]){
        res.json( passOrUserError );
      } else if(passwordHash.verify(pass, result.rows[0].passwords)){
        let token = jwt.sign({"user": userName, "password": pass}, secretKey);
        res.json({
          success: true,
          token: token,
          user: userName
        })
      } else {
        res.json( passOrUserError );
      }
    }
  })
}

function registerPost(req,res) {
  const userName = req.body.user;
  const pass = passwordHash.generate(req.body.pass);

  pool.query('SELECT user_name FROM ' + table + ' WHERE user_name = $1', [userName], function(err, result) {
    if(err) {
      res.json( { "error": err.message } );
    } else {
      if(!result.rows[0]) {
        pool.query('INSERT INTO ' + table + ' (passwords, user_name) VALUES( $1, $2);', [pass ,userName], function(err, result) {
          if(err) {
            res.json( { "error": err.message } );
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
}

function postNewRoom(req,res) {
  const roomName = req.body.name;
  const token = req.headers['auth'];

  jwt.verify(token, secretKey, function(err, decoded) {
    let owner = decoded.user;
    pool.query('INSERT INTO ' + roomTable + ' (name, owner) VALUES( $1, $2) RETURNING *;', [roomName , owner], function(err, result) {
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
}

function getOneRoom(req,res) {
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
}

function getAllRoom(req,res) {

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
}

app.listen(process.env.PORT, function(){
  console.log('Server is running, Port: ' + process.env.PORT);
});

module.exports = app;