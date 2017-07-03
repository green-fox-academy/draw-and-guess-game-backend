'use strict';

const test = require('tape');
const request = require('supertest');
require('dotenv').config()
const app = require('./server.js');
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoidGVzdCIsInBhc3N3b3JkIjoiMTIzNCIsImlhdCI6MTQ5NzUzNDA2MH0.I0Ru-1gBA-D0LtxlRhjFg8y9ZeqYqdaaNPN3npONSGg";

test('POST /login', function (assert) {
  const userData = {
    "user": "Kacsa",
    "pass": "kacsa"
  };
  request(app)
    .post('/login')
    .send(userData)
    .expect(200)
    .expect('Content-Type', /json/)
    .end(function (err, res) {
      const responseData = res.body;
    assert.error(err, 'No error');
    assert.same(responseData.success, true);
    assert.end();
  });
});

test('POST /login with non-existent account', function (assert) {
  const userData = {
    "user": "xxx",
    "pass": "1234"
  };
  request(app)
    .post('/login')
    .send(userData)
    .expect(200)
    .expect('Content-Type', /json/)
    .end(function (err, res) {
      const responseData = res.body;
    assert.error(err, 'No error');
    assert.same(responseData.status, "error");
    assert.same(responseData.message, 'Wrong username or password.');
    assert.end();
  });
});

test('POST /login with incorrect password', function (assert) {
  const userData = {
    "user": "test",
    "pass": "1"
  };
  request(app)
    .post('/login')
    .send(userData)
    .expect(200)
    .expect('Content-Type', /json/)
    .end(function (err, res) {
      const responseData = res.body;
    assert.error(err, 'No error');
    assert.same(responseData.status, "error");
    assert.same(responseData.message, 'Wrong username or password.');
    assert.end();
  });
});

test('POST /register with reserved username', function (assert) {
  const userData = {
    "user":"test",
    "pass": "1234"
  };
  request(app)
    .post('/register')
    .send(userData)
    .expect(200)
    .expect('Content-Type', /json/)
    .end(function (err, res) {
      const responseData = res.body;
    assert.error(err, 'No error');
    assert.same(responseData.status, "error");
    assert.same(responseData.message, 'Username is already taken.');
    assert.end();
  });
});

test('POST /register.If user doesn\'t exist then create one, else throw error', function (assert) {
  const userData = {
    "user": "Kacsa",
    "pass": "kacsa"
  };
  request(app)
    .post('/register')
    .send(userData)
    .expect(200)
    .expect('Content-Type', /json/)
    .end(function (err, res) {
      const responseData = res.body;
    assert.error(err, 'No error');
    assert.same(responseData.success || responseData.status, responseData.success?true:"error");
    assert.end();
  });
});

test('POST /room everything allright', function (assert) {
  const userData = {
    "name":"My room"
  };
  request(app)
    .post('/room')
    .send(userData)
    .set({"auth": token})
    .expect(200)
    .expect('Content-Type', /json/)
    .end(function (err, res) {
      const responseData = res.body;
    assert.error(err, 'No error');
    assert.same(responseData.status, 'ok');
    assert.end();
  });
});

test('POST /room without authentication', function (assert) {
  const userData = {
    "name":"My room"
  };
  request(app)
    .post('/room')
    .send(userData)
    .set({"auth": 'asd'})
    .expect(401)
    .expect('Content-Type', /json/)
    .end(function (err, res) {
      const responseData = res.body;
    assert.error(err, 'No error');
    assert.same(responseData.status, 'error');
    assert.same(responseData.message, 'Authentication required');
    assert.end();
  });
});

test('POST /room/55/image', function (assert) {
  const userData = {
    "image_url": "IMAGEFILESAMPLE35235cjqmrigherg"
  };
  request(app)
    .post('/room/55/image')
    .send(userData)
    .set({"auth": token})
    .expect(200)
    .expect('Content-Type', /json/)
    .end(function (err, res) {
      const responseData = res.body;
    assert.error(err, 'No error');
    assert.same(responseData.status, 'ok');
    assert.end();
  });
});

test('GET /room/55', function (assert) {
  request(app)
    .get('/room/55')
    .set({"auth": token})
    .expect(200)
    .expect('Content-Type', /json/)
    .end(function (err, res) {
      const responseData = res.body;
    assert.error(err, 'No error');
    assert.same(responseData.id, 55);
    assert.end();
  });
});

test('GET /room', function (assert) {
  request(app)
    .get('/room')
    .set({"auth": token})
    .expect(200)
    .expect('Content-Type', /json/)
    .end(function (err, res) {
      const responseData = res.body;
    assert.error(err, 'No error');
    assert.end();
  });
});

test('GET /user', function (assert) {
  request(app)
    .get('/user')
    .set({"auth": token})
    .expect(200)
    .expect('Content-Type', /json/)
    .end(function (err, res) {
      const responseData = res.body;
    assert.error(err, 'No error');
    assert.same(responseData.name, "test");
    assert.end();
  });
});