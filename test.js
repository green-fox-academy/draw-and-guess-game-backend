'use strict';

const test = require('tape');
const request = require('supertest');

const app = require('./server.js');

test('POST /login', function (assert) {
	const userData = {
		"user":"test",
		"pass": "1234"
	};
	request(app)
		.post('/login')
		.send(userData)
		.expect(200)
		.expect('Content-Type', /json/)
		.end(function (err, res) {
			const actualThing = res.body;
		assert.error(err, 'No error');
		assert.same(actualThing.success, true);
		assert.end();
	});
});

test('POST /login with non-existent account', function (assert) {
	const userData = {
		"user":"xxx",
		"pass": "1234"
	};
	request(app)
		.post('/login')
		.send(userData)
		.expect(200)
		.expect('Content-Type', /json/)
		.end(function (err, res) {
			const actualThing = res.body;
		assert.error(err, 'No error');
		assert.same(actualThing.status, "error");
		assert.end();
	});
});

test('POST /login with incorrect password', function (assert) {
	const userData = {
		"user":"test",
		"pass": "1"
	};
	request(app)
		.post('/login')
		.send(userData)
		.expect(200)
		.expect('Content-Type', /json/)
		.end(function (err, res) {
			const actualThing = res.body;
		assert.error(err, 'No error');
		assert.same(actualThing.status, "error");
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
			const actualThing = res.body;
		assert.error(err, 'No error');
		assert.same(actualThing.status, "error");
		assert.end();
	});
});

test('POST /register', function (assert) {
	const userData = {
		"user":"admin",
		"pass": "admin"
	};
	request(app)
		.post('/register')
		.send(userData)
		.expect(200)
		.expect('Content-Type', /json/)
		.end(function (err, res) {
			const actualThing = res.body;
		assert.error(err, 'No error');
		assert.same(actualThing.success, true);
		assert.end();
	});
});