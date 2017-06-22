const express = require('express');
const jwt = require('jsonwebtoken');
require('dotenv').config()

const secretKey = process.env.KEY;

const authenticated = express.Router(); 

authenticated.use(function(req, res, next) {
  let token = req.headers['auth'];
  if (token) {
    jwt.verify(token, secretKey, function(err, decoded) {      
      if (err) {
        return res.status(401).json({ "status": "error", "message": "Authentication required" });    
      } else {
        next();
      }
    });
  } else {
    return res.status(401).json({ "status": "error", "message": "Authentication required" });
  }
});

module.exports = authenticated;