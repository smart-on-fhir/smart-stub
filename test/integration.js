var fetch = require('node-fetch');
var assert = require('assert');
var server = require('../src/server');
var querystring = require('querystring');
var status = require('http-status');
var jwt = require('jsonwebtoken');
var config = require('../src/config');

describe('/user', function() {
  var listening;

  before(function() {
    listening = server.listen(3000);
  });

  after(function() {
    listening.close();
  });

  it('gives a token when user and app are valid', function(done) {
    fetch('http://localhost:3000/api/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: querystring.stringify({
        username: "demo",
        password: "demo",
        grant_type: "password",
        client_id: "my_web_app"
      })
    }).then(function(response){
      assert(response.status === 200);
      done()
    })
  });


  it('gives no token when client is invalid', function(done) {
    fetch('http://localhost:3000/api/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: querystring.stringify({
        username: "demo",
        password: "demo",
        grant_type: "password",
        client_id: "bad-client"
      })
    }).then(function(response){
      assert(response.status > 400);
      done()
    })
  });

  it('gives no token when user is invalid', function(done) {
    fetch('http://localhost:3000/api/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: querystring.stringify({
        username: "demo",
        password: "bad",
        grant_type: "password",
        client_id: "my_web_app"
      })
    }).then(function(response){
      assert(response.status > 400);
      done()
    })
  });

  it('issues a code when smart/portal scope is present', function(done){
    fetch('http://localhost:3000/api/oauth/code', {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + jwt.sign({
          scope: 'badness and smart/portal works'
        }, config.jwtSecret, { expiresIn: "5m" })
      },
      body: JSON.stringify({
        patient: '123',
        client_id: 'my_web_app',
        scope: 'patient/*.read'
      })
    }).then(function(response){
      return response.json();
    }).then(function(j){
      assert(j.code.length > 100);
      done();
    });
  })

  it('fails ot issue a code when smart/portal scope is missing', function(done){
    fetch('http://localhost:3000/api/oauth/code', {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + jwt.sign({
          scope: 'badness and fails'
        }, config.jwtSecret, { expiresIn: "5m" })
      },
      body: JSON.stringify({
        patient: '123',
        client_id: 'my_web_app',
        scope: 'patient/*.read'
      })
    }).then(function(response){
      assert(response.status > 400);
      done()
    })
  })
});
