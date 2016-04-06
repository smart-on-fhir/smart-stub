"use strict";
var assert = require("assert");
var url = require("url")
var jwt = require('jsonwebtoken');
var bodyParser = require('body-parser');
var router = require('express').Router();
var request = require('request');
var xml2js = require('xml2js');
var config = require('./config');

if(!Object.assign){
  Object.assign = require('object-assign');
}

module.exports = router;

var lookups = [unauthenticatedClient, authentications, grants, token];

var jsonParser = bodyParser.json()

router.post("/code", jsonParser, lookups, needScope("smart/portal"), function(req, res, next){
  console.log("Code postedm=", req.token);
  res.json({
    code: signedCode(req.body),
    redirect_uris: req.unauthenticatedClient.client_id,
    user: req.token.grant.user
  });
});

// Auto-authorize with no UI, for non-verifying mode only
router.get("/authorize", lookups, function (req, res, next) {

  assert(!config.clientService.enabled)

  if (normalizeURL(req.query.aud) != normalizeURL(config.baseUrl + '/api/fhir')) {
    res.status(400);
    res.send("Bad audience: " + req.query.aud + " vs. " + normalizeURL(config.baseUrl + '/api/fhir'));
    return;
  }

  var launchJwt = req.query.launch && req.query.launch.replace(/=/g, "");

  var code = Object.assign(
    {},
    launchJwt && jwt.decode(launchJwt) || {}, {
      client_id: req.query.client_id,
      scope: req.query.scope
    })

    var state = req.query.state;
    var signedCode = jwt.sign(code, config.jwtSecret, { expiresIn: "5m" });
    var redirect = req.query.redirect_uri;

    var query = {
      code: signedCode,
      state: state
    };

    res.redirect(req.query.redirect_uri + url.format({query: query}));
});

function grants(req, res, next){
  var grantType = req.body && req.body.grant_type;
  if (grantType === 'password') {
    config.userService
    .check(req.body.username, req.body.password)
    .then(function(user){
      req.grant = {
        grant_type: 'password',
        user: user.fhirId,
        scope: 'smart/portal',
      }
      return next();
    }).catch(next);
  } else if (grantType === 'authorization_code') {
    req.grant = jwt.verify(req.body.code, config.jwtSecret)
    return next();
  } else if (grantType === 'refresh_token') {
    req.grant = jwt.verify(req.body.refresh_token, config.jwtSecret)
    return next();
  } else {
    return next();
  }
}

function authentications(req, res, next){
  if(req.header.authorization && req.headers.authorization.match(/^Basic/)){
    return config.clientService
    .check(req)
    .then(function(client){
      req.authentication = {
        client: client
      };
      return next();
    }).catch(next)
  }
  req.authentication = {
    none: true
  };
  next();
}

router.post("/token", bodyParser.urlencoded({ extended: false }), lookups, function (req, res, next) {
  var codeRaw;
  var grant = req.grant;
  var scope = grant.scope || "";
  console.log("GRANT", req.grant, scope)
  console.log("client", req.authentication.client);
  console.log("unauth", req.unauthenticatedClient);

  if (req.unauthenticatedClient && req.authentication.client){
    assert(req.unauthenticatedClient === req.authentication.client);
  }

  if (config.clientService.enabled){
    scope = scope
    .split(/\s+/)
    .filter(function(s){ return req.unauthenticatedClient.scope.split(/\s+/).indexOf(s) !== -1 })
    .join(" ");
    console.log("Scope switich", scope, "vs client", unauthenticatedClient.scope);

    if (grant.client_id &&
        grant.client_id  !== req.unauthenticatedClient.client_id) {
          throw "Client ID mismatch: " +
            grant.client_id + " vs. " + req.unauthenticatedClient.client_id;
        }
  }

  if (scope.indexOf('offline_access') >= 0) {
    code.launch['refresh_token'] = jwt.sign(code, config.jwtSecret);
  }

  var refresh;
  if(scope.indexOf('offline_access')  !== -1){
    refresh = jwt.sign(code, config.jwtSecret);
  }

  var token = Object.assign({}, grant.context || {},  {
    scope: scope,
    token_type: "Bearer",
    expires_id: 3600,
    refresh_token: refresh,
    client_id: unauthenticatedClient.client_id
  });

  token.access_token = jwt.sign({
    grant: grant,
    token: token
  }, config.jwtSecret, {
    expiresIn: "1h"
  });

  res.json(token);

});

function signedCode(params){
  if(!params.client_id){
    throw "Need a client id in " + params;
  }
  if(!params.scope){
    throw "Need a scope in " + params;
  }
  return jwt.sign(params, config.jwtSecret, { expiresIn: "5m" });
}

function unauthenticatedClient(req, res, next){
  config
  .clientService
  .lookup(req)
  .then(function(client){
    req.unauthenticatedClient = client;
    next();
  }).catch(next)
}

function normalizeURL(url) {
  if (url.match(/\/$/)) {
    url = url.substring(0, url.length - 1);
  }
  return url.toLowerCase();
}

function token(req, res, next){
  if (!req.headers.authorization || !req.headers.authorization.match(/^Bearer /)) {
    return next();
  }
  var token = jwt.verify(req.headers.authorization.split("Bearer ")[1], config.jwtSecret);
  if (token.exp >= new Date()) {
    return next("expired token", 401);
  }
  req.token = token;
  next()
}

function needScope(target){
  return function(req, res, next){
    if (!config.clientService.enabled){
      return next()
    }

    if (req.token.scope.split(/\s+/).filter(function(s){ return s === target; }).length !== 1){
      return next(token.scope + " doesn't have one element = " + target);
    }
    return next();
  }
}

