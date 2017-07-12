'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const pg = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const config = require('./database_config.js');
const authentication = require('./authentication.js');
const querySettings = require('./database_query_settings.js');
const uuid = require('node-uuid')
const fs = require('fs');

require('dotenv').config()

const app = express();
app.use(cors());
app.use(bodyParser.json());

const table = process.env.TABLE;
const roomTable = process.env.ROOM_TABLE;
const secretKey = process.env.KEY;
const saltRounds = 10;
const currentdate = new Date();
const currentTime = currentdate.getFullYear()+ "-"
                + (currentdate.getMonth()+1) + "-" 
                + currentdate.getDate() + " "
                + currentdate.getHours() + ":"  
                + currentdate.getMinutes() + ":" 
                + currentdate.getSeconds();

const pool = new pg.Pool(config);
module.exports.query = querySettings;

app.use(__dirname + '/image', express.static('image'));

app.use('/room', authentication);
app.use('/user', authentication);

app.post('/login', loginPost);
app.post('/register', registerPost);
app.post('/room', postNewRoom);
app.post('/room/:id/image', saveImage);
app.post('/room/:id/guess', guessedOrNot);

app.get('/room/:id', getOneRoom);
app.get('/room', getAllRoom);
app.get('/user', selectUser);

function loginPost(req, res) {
  const userName = req.body.user;
  const pass = req.body.pass;
  const passOrUserError = { "status": "error", "message": "Wrong username or password." }

  pool.query('SELECT passwords, id FROM ' + table + ' WHERE user_name = $1', [userName], function(err, result) {
    if(err) {
      res.json({
        "error": err.message
      });
    } else {
      if(!result.rows[0]) {
        res.json(passOrUserError);
      } else if(bcrypt.compareSync(pass, result.rows[0].passwords)){
        const userId = JSON.parse(JSON.stringify(result.rows[0])).id;
        const token = jwt.sign({"user": userName, "id": userId}, secretKey);
        res.json({
          success: true,
          token: token,
        })
      } else {
        res.json(passOrUserError);
      }
    }
  })
}

function registerPost(req, res) {
  const userName = req.body.user;
  const pass = bcrypt.hashSync(req.body.pass, saltRounds);

  pool.query('SELECT user_name FROM ' + table + ' WHERE user_name = $1', [userName], function(err, result) {
    if(err) {
      res.json({ "error": err.message });
    } else {
      if(!result.rows[0]) {
        pool.query('INSERT INTO ' + table + ' (passwords, user_name, score) VALUES($1, $2, $3) RETURNING id;', [pass ,userName, 0], function(err, result) {
          if(err) {
            res.json({ "error": err.message });
          } else {
            const userId = JSON.parse(JSON.stringify(result.rows[0])).id;
            const token = jwt.sign({"user": userName, "id": userId}, secretKey);
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
}

function postNewRoom(req, res) {
  const roomName = req.body.name;
  const token = req.headers['auth'];

  jwt.verify(token, secretKey, function(err, decoded) {
    const user = decoded.user;
    pool.query('SELECT id FROM ' + table + ' WHERE user_name = $1;', [user], function(err, result) {
      if(err) { res.json({ "err": err.message }) }
      else {
        const drawerID = result.rows[0].id;

        pool.query('INSERT INTO ' + roomTable + ' (name, status, drawer_user_id, drawing, current_turn) VALUES( $1, $2, $3, $4, $5) RETURNING *;', 
          [roomName, 0, drawerID, 'Elephant', 'drawer'], function(err, result) {
          if(err){
            res.json(
              { "status": "error", "message": "Could not create the room, "+ err.message }
            )
          } else {
            const createdRoom = JSON.parse(JSON.stringify(result.rows[0]));
            res.json({
            "status": "ok",
            "room": createdRoom 
            })
          }
        })
      }
    })
  })
}

function getOneRoom(req, res) {
  const roomID = req.params.id;

  pool.query('SELECT * FROM ' + roomTable + ' WHERE id = $1', [roomID], function(err, result) {
    if(!result.rows[0]){
      res.json(
        { "status": "error", "message": "Room with the given id was not found" }
      )
    } else {
      const selectedRoom = JSON.parse(JSON.stringify(result.rows[0]));
      res.json( selectedRoom );
    }
  })
}

function getAllRoom(req, res) {

  pool.query('SELECT * FROM ' + roomTable, function(err, result) {
    if(err){
      res.json(
        { "status": "error" }
      )
    } else {
      const rooms = JSON.parse(JSON.stringify(result.rows));
      res.json( rooms );
    }
  })
}

function saveImage(req, res) {
  const roomID = req.params.id;

  pool.query('SELECT * FROM ' + roomTable + ' WHERE id = $1', [roomID], function(err, result) {
    if(err){
      res.json(
        { "status": err.message }
      )
    } else {
      const selectedRoom = JSON.parse(JSON.stringify(result.rows[0]));
        if(selectedRoom.image_url === null){
          const image = req.body.image_data;
          pool.query('UPDATE ' + roomTable + ' SET image_url = $1 WHERE id = $2;', [image, roomID], function(err, result) {
            if(err){
              res.json(
                { "status": err.message }
              )
            } else {
              res.json({
                "status": "ok",
              });
            }
            })
        }else {
          res.json({
            "status": "error",
            "message": "The room has an image already."
          });
        }
    }
  })
}

function selectUser(req, res){
  const token = req.headers['auth'];
  jwt.verify(token, secretKey, function(err, decoded) {
    const userName = decoded.user;
      pool.query('SELECT * FROM ' + table + ' WHERE user_name = $1', [userName], function(err, result) {
      if(!result.rows[0]){
        res.json(
          { "status": "error", "message": "Room with the given id was not found" }
        )
      } else {
        const selectedUser = JSON.parse(JSON.stringify(result.rows[0]));
        res.json({
          "name": selectedUser.user_name,
          "score": selectedUser.score
         });
      }
    })
  })
};

app.put('/room/:id', updateRoom);

function updateRoom(req, res) {
  const roomID = req.params.id;
  const changeData = req.body;
  const token = req.headers['auth'];
  
  jwt.verify(token, secretKey, function(err, decoded) {
    const user = decoded.user;
    pool.query('SELECT id FROM ' + table + ' WHERE user_name = $1;', [user], function(err, result) {    
      const guesserID = result.rows[0].id;

      let requistedDataChange = '';
      let dataList = [roomID];

      Object.keys(changeData).forEach( (e, i) => {
        let index = i+2
        if(e === 'guesser_user_id'){
          changeData[e] = guesserID;
        } else if (e === 'guesser_joined_at'){
          changeData[e] = currentTime;
        }

        if(Object.keys(changeData).length-1 === i){
          requistedDataChange += e + ' = $' + index;
        } else {
          requistedDataChange += e + ' = $' + index + ', ';
        }
        dataList.push(changeData[e]);
      })

      pool.query('UPDATE ' + roomTable + ' SET ' + requistedDataChange + ' WHERE id = $1;', dataList,  function(err, result) {
        if(err) { res.json({"err": err.message }) } 
        else {
          res.json({ 'status':'ok' });
        }       
      })
    })
  })
}

function guessedOrNot(req, res) {
  const roomID = req.params.id;
  const guess = req.body.guess;

  pool.query('SELECT drawing FROM ' + roomTable + ' WHERE id = $1;', [roomID], function(err, result) {
    if(err) { res.json({"err": err.message }) }
    else {
      const drawed = JSON.parse(JSON.stringify(result.rows[0])).drawing;
      if(guess.toLowerCase() === drawed.toLowerCase()) {
        res.json({ "guessed": true })
      } else {
        res.json({ "guessed": false })
      }
    }
  })
}

app.listen(process.env.PORT, function(){
  console.log('Server is running, Port: ' + process.env.PORT);
});

module.exports = app;