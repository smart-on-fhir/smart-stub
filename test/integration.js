var fetch = require('node-fetch');
var assert = require('assert');
var server = require('../src/server');
var querystring = require('querystring');
var status = require('http-status');
var jwt = require('jsonwebtoken');
var config = require('../src/config');
var url = require('url');

var portalToken;
var issuedCode;
var appAccessToken;

describe('auth service', function() {
  var listening;
  before(function() {
    listening = server.listen(3000);
  });

  after(function() {
    listening.close();
  });

  it('issues a token when user and app are valid', function() {
    return fetch('http://localhost:3000/api/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: querystring.stringify({
        username: "demo",
        password: "demo",
        grant_type: "password",
        scope: "smart/portal",
        client_id: "my_web_app"
      })
    }).then(function(response){
      assert.equal(response.status, 200);
      return response.json();
    }).then(function(token){
      assert.equal(token.scope, "smart/portal");
      console.log(token)
      portalToken = token;
    })
  });

  it('issues a token when code and app are valid', function() {
    return fetch('http://localhost:3000/api/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: querystring.stringify({
        code: jwt.sign({
          client_id: 'my_web_app',
          scope: 'patient/*.read',
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
        assert.equal(verified.claims.scope, 'patient/*.read')
        console.log("VERIFIED", verified)
        assert.equal(token.patient, '99912345')
      })
    })
  });

  it('issues no token when client is invalid', function(done) {
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

  it('issues no token when user is invalid', function(done) {
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

  it('issues a code when we use our portal access token', function(){
    return fetch('http://localhost:3000/api/oauth/code', {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + portalToken.access_token
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
      issuedCode = j.code;
    });
  })

  it('issues an app access token when our issued code is used', function() {
    return fetch('http://localhost:3000/api/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: querystring.stringify({
        code: issuedCode,
        grant_type: "authorization_code",
        client_id: "my_web_app"
      })
    }).then(function(response){
      assert.equal(response.status, 200);
      return response.json().then(function(token){
        appAccessToken =token;
        var verified = jwt.verify(token.access_token, config.jwtSecret)
        assert.equal(verified.claims.scope, 'patient/*.read')
        console.log("VERIFIED", verified)
      })
    })
  });


  it('issues a code when we synthesize an access token with smart/portal scope', function(){
    return fetch('http://localhost:3000/api/oauth/code', {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + jwt.sign({
          claims: {
            scope: 'goodness and smart/portal',
          },
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
    });
  })

  it('refuses to issue a code with a synthesized access token missing the smart/portal scope', function(){
    return fetch('http://localhost:3000/api/oauth/code', {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + jwt.sign({
          claims: {
            scope: 'badness and fails',
          },
          grant: {
            user: 'Patient/99912345'
          }
        }, config.jwtSecret, { expiresIn: "5m" })
      },
      body: JSON.stringify({
        patient: '99912345',
        client_id: 'my_web_app',
        scope: 'patient/*.read'
      })
    }).then(function(response){
      assert.notEqual(response.status, 200);
    })
  })

  it('fails the auto-authorize process', function(){
    return fetch('http://localhost:3000/api/oauth/authorize' + url.format({query: {
      client_id: 'my_web_app',
      scope: 'my favorite scopes',
      state: 'abc',
      redirect_uri: 'http://wherever-i-want.local',
      aud: 'https://stub-dstu2.smarthealthit.org/api/fhir'
    }})).then(function(response){
      assert(response.status > 400);
    })
  })


  describe('when client checking is disabled', function() {
    var prevClientService, prevSecurity;

    before(function() {
      prevClientService = config.clientService;
      prevSecurity = config.disableSecurity;
      config.clientService = require('../src/services/client')('none');
      config.disableSecurity = true;
    });

    after(function() {
      config.clientService = prevClientService;
      config.disableSecurity = prevSecurity;
    });

    it('fails /code', function(){
      return fetch('http://localhost:3000/api/oauth/code', {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + jwt.sign({
            scope: 'smart/portal',
            grant: {
              user: 'Patient/99912345'
            }
          }, config.jwtSecret, { expiresIn: "5m" })
        },
        body: JSON.stringify({
          patient: '99912345',
          client_id: 'my_web_app',
          scope: 'patient/*.read'
        })
      }).then(function(response){
        assert.notEqual(response.status, 200);
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

    it('allows end-to-end launch', function(){
      var launchContext = jwt.sign({
        context: {
          patient: "99912345"
        }
      }, null, {
        algorithm: "none"
      });

      return fetch('http://localhost:3000/api/oauth/authorize' + url.format({query: {
        client_id: 'anything_goes',
        scope: 'my favorite scopes',
        state: 'abc',
        redirect_uri: 'http://wherever-i-want.local',
        aud: 'https://stub-dstu2.smarthealthit.org/api/fhir',
        launch: launchContext
      }}), {redirect: 'manual'}).then(function(response){
        assert.equal(response.status, 302);
        var redirect = url.parse(response.headers.get("location"), true);
        assert.equal(redirect.host, "wherever-i-want.local");
        assert.equal(redirect.query.state, "abc");
        var code = redirect.query.code
        var verified = jwt.verify(code, config.jwtSecret)
        assert.deepEqual({
          grant_type: 'authorization_code',
          client_id: 'anything_goes',
          scope: 'my favorite scopes',
          context: {
            patient: '99912345'
          }
        }, {
          grant_type: verified.grant_type,
          client_id: verified.client_id,
          scope: verified.scope,
          context: verified.context
        })
        return code;
      }).then(function(code){
        return fetch('http://localhost:3000/api/oauth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: querystring.stringify({
            grant_type: "authorization_code",
            client_id: "anything_goes",
            code: code
          })
        })
      })
      .then(function(response){
        assert.equal(response.status, 200);
        return response.json()
      }).then(function(token){
        assert.deepEqual({
          token_type: 'Bearer',
          scope: 'my favorite scopes',
          patient: '99912345',
          expires_in: 3600
        }, {
          token_type: token.token_type,
          patient: token.patient,
          scope: token.scope,
          expires_in: token.expires_in
        })
      })
    })
  });

});


describe('reverse proxy', function() {
  before(function() {
    listening = server.listen(3000);
    config.fhirServer = 'http://localhost:3000'
  });

  after(function() {
    listening.close();
  });

  it('uses a token when present', function(){
    return fetch('http://localhost:3000/api/fhir/Patient?', {
      method: 'get',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + appAccessToken.access_token
      },
    }).then(function(response){
      assert.equal(response.status, 404)
    });
  })


})
