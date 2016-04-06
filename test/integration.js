var fetch = require('node-fetch');
var assert = require('assert');
var server = require('../src/server');
var querystring = require('querystring');
var status = require('http-status');
var jwt = require('jsonwebtoken');
var config = require('../src/config');
var url = require('url');

describe('auth service', function() {
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

  it('gives a token when code and app are valid', function() {
    return fetch('http://localhost:3000/api/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: querystring.stringify({
        code: jwt.sign({
          client_id: 'my_web_app',
          scope: 'patient/*.read fake abd',
          user: 'Patient/99912345',
          context: {
            patient: '99912345'
          }
        }, config.jwtSecret, { expiresIn: "5m" }),
        grant_type: "authorization_code",
        client_id: "my_web_app"
      })
    }).then(function(response){
      assert.equal(response.status, 200);
      return response.json().then(function(token){
        var verified = jwt.verify(token.access_token, config.jwtSecret)
        assert.equal(verified.token.scope, 'patient/*.read')
        console.log("VERIFIED", verified)
        assert.equal(token.patient, '99912345')
      })
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
          scope: 'badness and smart/portal works',
          grant: {
            user: 'Patient/99912345'
          }
        }, config.jwtSecret, { expiresIn: "5m" })
      },
      body: JSON.stringify({
        client_id: 'my_web_app',
        scope: 'patient/*.read',
        context: {
          patient: '99912345',
        }
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
        patient: '99912345',
        client_id: 'my_web_app',
        scope: 'patient/*.read'
      })
    }).then(function(response){
      assert(response.status > 400);
      done()
    })
  })

  it('fails the auto-authorize process', function(done){
    fetch('http://localhost:3000/api/oauth/authorize' + url.format({query: {
      client_id: 'my_web_app',
      scope: 'my favorite scopes',
      state: 'abc',
      redirect_uri: 'http://wherever-i-want.local',
      aud: 'https://stub-dstu2.smarthealthit.org/api/fhir'
    }})).then(function(response){
      assert(response.status > 400);
      done()
    })
  })

  describe('when client checking is disabled', function() {
    var prev;

    before(function() {
      prev = config.clientService;
      config.clientService = require('../src/client-service')('none');
    });

    after(function() {
      config.clientService = prev;
    });

    it('fails /code', function(done){
      fetch('http://localhost:3000/api/oauth/code', {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + jwt.sign({
            scope: 'smart/portal'
          }, config.jwtSecret, { expiresIn: "5m" })
        },
        body: JSON.stringify({
          patient: '99912345',
          client_id: 'my_web_app',
          scope: 'patient/*.read'
        })
      }).then(function(response){
        assert(response.status > 400);
        done()
      })
    })

    it('auto-completes authorization process', function(){
      return fetch('http://localhost:3000/api/oauth/authorize' + url.format({query: {
        client_id: 'anything_goes',
        scope: 'my favorite scopes',
        state: 'abc',
        redirect_uri: 'http://wherever-i-want.local',
        aud: 'https://stub-dstu2.smarthealthit.org/api/fhir'
      }}), {redirect: 'manual'}).then(function(response){
        assert(response.status === 302)
      })
    })

    it('still fails when audience is wrong', function(){
      return fetch('http://localhost:3000/api/oauth/authorize' + url.format({query: {
        client_id: 'anything_goes',
        scope: 'my favorite scopes',
        state: 'abc',
        redirect_uri: 'http://wherever-i-want.local',
        aud: 'http://incorrect-aud'
      }}), {redirect: 'error'}).then(function(response){
        assert(response.status !== 302);
      })
    })

  });

});
