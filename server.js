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

const pool = new pg.Pool(config);
module.exports.query = querySettings;

//app.use('/image', express.static('image'));
app.use(__dirname + '/image', express.static('image'));

app.use('/room', authentication);
app.use('/user', authentication);

app.post('/login', loginPost);
app.post('/register', registerPost);
app.post('/room', postNewRoom);
app.post('/room/:id/image', saveImage);

app.get('/room/:id', getOneRoom);
app.get('/room', getAllRoom);
app.get('/user', selectUser);

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
      } else if(bcrypt.compareSync(pass, result.rows[0].passwords)){
        const token = jwt.sign({"user": userName}, secretKey);
        res.json({
          success: true,
          token: token,
        })
      } else {
        res.json( passOrUserError );
      }
    }
  })
}

function registerPost(req,res) {
  const userName = req.body.user;
  const pass = bcrypt.hashSync(req.body.pass, saltRounds);

  pool.query('SELECT user_name FROM ' + table + ' WHERE user_name = $1', [userName], function(err, result) {
    if(err) {
      res.json( { "error": err.message } );
    } else {
      if(!result.rows[0]) {
        pool.query('INSERT INTO ' + table + ' (passwords, user_name, score) VALUES( $1, $2, $3);', [pass ,userName, 0], function(err, result) {
          if(err) {
            res.json( { "error": err.message } );
          } else {
            const token = jwt.sign({"user": userName}, secretKey);
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

function postNewRoom(req,res) {
  const roomName = req.body.name;
  const token = req.headers['auth'];

  jwt.verify(token, secretKey, function(err, decoded) {
    const owner = decoded.user;
    pool.query('INSERT INTO ' + roomTable + ' (name, owner, status) VALUES( $1, $2, $3) RETURNING *;', [roomName , owner, 0], function(err, result) {
      if(err){
        res.json(
          { "status": "error", "message": "Could not create the room" }
        )
      } else {
        const createdRoom = JSON.parse(JSON.stringify(result.rows[0]));
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
      const selectedRoom = JSON.parse(JSON.stringify(result.rows[0]));
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
      const rooms = JSON.parse(JSON.stringify(result.rows));
      res.json( rooms );
    }
  })
}

function saveImage(req,res) {
  const roomID = req.params.id;

  pool.query('SELECT * FROM ' + roomTable + ' WHERE id = $1', [ roomID ],function(err, result) {
    if(err){
      res.json(
        { "status": err.message }
      )
    } else {
      const selectedRoom = JSON.parse(JSON.stringify(result.rows[0]));
        if(selectedRoom.image_url === null){
          const image = req.body.image_data;
          pool.query('UPDATE '+ roomTable +' SET image_url = $1 WHERE id = $2;', [image, roomID] ,function(err, result) {
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





// function saveImage(req,res) {
//   const roomID = req.params.id;

//   pool.query('SELECT * FROM ' + roomTable + ' WHERE id = $1', [ roomID ],function(err, result) {
//     if(err){
//       res.json(
//         { "status": err.message }
//       )
//     } else {
//       const selectedRoom = JSON.parse(JSON.stringify(result.rows[0]));
//         if(selectedRoom.image_url === null){
//           const image = req.body.image_data;
//           const fileName = uuid.v4();
//           const filePath = __dirname + "/image/" + fileName + ".png" 
//           const base64Data = image.replace(/^data:image\/png;base64,/, "");

//           fs.existsSync("image") || fs.mkdirSync("image");
//           fs.writeFile(filePath,  new Buffer(base64Data, "base64"), function(err) {
//             if(err) {
//                 res.json(
//                   { "status": err.message }
//                 )
//             }else{
//               pool.query('UPDATE '+ roomTable +' SET image_url = $1 WHERE id = $2;', [filePath, roomID] ,function(err, result) {
//               if(err){
//                 res.json(
//                   { "status": err.message }
//                 )
//               } else {
//                 console.info("The file was saved!");
//                 res.json({
//                   "status": "ok",
//                   "path": filePath
//                 });
//               }
//               })
//             }});
//         }else {
//           res.json({
//             "status": "error",
//             "message": "The room has an image already."
//           });
//         }
//     }
//   })
// }


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

app.listen(process.env.PORT, function(){
  console.log('Server is running, Port: ' + process.env.PORT);
});

module.exports = app;