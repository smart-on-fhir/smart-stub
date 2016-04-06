"use strict";

var url = require("url")
var jwt = require('jsonwebtoken');
var bodyParser = require('body-parser');
var router = require('express').Router();
var request = require('request');
var xml2js = require('xml2js');
var config = require('./config');

module.exports = router;

// Need polyfills for older Node.js implementations
String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};
Object.assign = require('object-assign');

function normalizeURL(url) {
  if (url.endsWith('/')) {
    url = url.substring(0, url.length - 1);
  }
  return url.toLowerCase();
}

router.get("/authorize", function (req, res, next) {
  if (normalizeURL(req.query.aud) != normalizeURL(config.baseUrl + '/api/fhir')) {
    return res.send("Bad audience value", 400);
  }
  var incomingJwt = req.query.launch && req.query.launch.replace(/=/g, "");
  var code = {
    launch: incomingJwt && jwt.decode(incomingJwt) || {},
    client_id: req.query.client_id,
    scope: req.query.scope
  };

  var state = req.query.state;
  var signedCode = jwt.sign(code, config.jwtSecret, { expiresIn: "5m" });

  config.clientService
  .lookup(req)
  .then(function(client){
    var redirect = req.query.redirect_uri;
    if (config.clientService.enabled){
      if (-1 === client.redirect_uris.indexOf(redirect)){
        throw "Bad redirect URI " + redirect + " vs. " + client.redirect_uris;
      }
    }
    var query = {
      code: signedCode,
      state: state
    };
    res.redirect(req.query.redirect_uri + url.format({query: query}));
  }).catch(next);
});

router.post("/token", bodyParser.urlencoded({ extended: false }), function (req, res, next) {
  var grantType = req.body.grant_type;
  var codeRaw;
  var grant;

  var client = config.clientService.check(req)

  if (grantType === 'password') {
    grant = config.userService
    .check(req.body.username, req.body.password)
    .then(function(user){
      return {
        user: user.fhirId,
        scope: "smart/portal",
      }
    });
  } else if (grantType === 'authorization_code') {
    grant = Promise.resolve(jwt.verify(req.body.code, config.jwtSecret))
  } else if (grantType === 'refresh_token') {
    grant = Promise.resolve(jwt.verify(req.body.refresh_token, config.jwtSecret))
  }

  var tokenDetails = Promise.all([client, grant])
  .then(function(values){
    var clientContext = values[0];
    var grantContext = values[1];
    var scope = grantContext.scope || "";

    if (config.clientService.enabled){
      scope = scope
      .split(/\s+/)
      .filter(function(s){ return clientContext.scope.split(/\s+/).indexOf(s) !== -1 })
      .join(" ");

      if (grantContext.client_id &&
          grantContext.client_id  !== clientContext.client_id) {
            throw "Client ID mismatch: " +
              grantContext.client_id + " vs. " + clientContext.client_id;
          }
    }

    if (scope.indexOf('offline_access') >= 0) {
      code.launch['refresh_token'] = jwt.sign(code, config.jwtSecret);
    }

    var refresh;
    if(scope.indexOf('offline_access')  !== -1){
      refresh = jwt.sign(code, config.jwtSecret);
    }

    var token = Object.assign({}, grantContext.launch || {},  {
      scope: scope,
      token_type: "Bearer",
      expires_id: 3600,
      refresh_token: refresh,
      client_id: clientContext.client_id
    });

    token.access_token = jwt.sign({
      grant_type: grantType,
      grant: grantContext,
      token: token
    }, config.jwtSecret, {
      expiresIn: "1h"
    });

    res.json(token);
  })
  .catch(next)

});
