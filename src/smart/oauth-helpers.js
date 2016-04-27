var config = require('../config');

module.exports = {
  populateGrants: function (req, res, next){
    var grantType = req.body && req.body.grant_type;
    if (grantType === 'password') {
      config.userService
      .check(req.body.username, req.body.password)
      .then(function(user){
        req.grant = {
          client_id: req.body.client_id,
          grant_type: 'password',
          user: user.fhirId,
          scope: req.body.scope || ""
        }
        return next();
      }).catch(next);
    } else if (grantType === 'authorization_code') {
      console.log('auth code 1');
      return config.tokenService
        .verify(req.body.code)
        .then(function (token) {
          console.log('auth code 2');
          req.grant = token;
          req.grant.grant_type = grantType;
          return next();
        })
        .catch(next);
    } else if (grantType === 'refresh_token') {
      console.log('refresh token 1');
      return config.tokenService
        .verify(req.body.refresh_token)
        .then(function (token) {
          console.log('refresh token 2');
          req.grant = token;
          req.grant.grant_type = grantType;
          return next();
        })
        .catch(next);
    } else {
      return next();
    }
  },

  populateAuthentications: function(req, res, next){
    if(req.headers.authorization && req.headers.authorization.match(/^Basic/)){
    console.log("For basic");
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
  },

  signedCode: function(params){
    return config.tokenService.sign(params);
  },

  populateUnauthenticatedClient: function(req, res, next){
    config
    .clientService
    .lookup(req)
    .then(function(client){
      req.unauthenticatedClient = client;
      next();
    }).catch(next)
  },

  ensureValidAudience: function(aud){
    if (normalizeURL(aud) != normalizeURL(config.baseUrl + '/api/fhir')) {
      throw "Bad audience: " + aud + " vs. " + normalizeURL(config.baseUrl + '/api/fhir');
    }
    return;
  },

  populateToken: function(req, res, next){
    if (!req.headers.authorization || !req.headers.authorization.match(/^Bearer /)) {
      return next();
    }
    var token = req.headers.authorization.split("Bearer ")[1];
    console.log('populateToken');
    config.tokenService
      .verify(token)
      .then(function (token) {
        req.token = token;
        next();
      })
      .catch(next);
  },

  ensureScope: function(target){
    return function(req, res, next){
      if (config.disableSecurity){
        return next()
      }

      console.log(req.token);
      if (req.token.claims.scope.split(/\s+/).filter(function(s){ return s === target; }).length !== 1){
        return next(token.scope + " doesn't have one element = " + target);
      }
      return next();
    }
  }
}

function normalizeURL(url) {
  if (url.match(/\/$/)) {
    url = url.substring(0, url.length - 1);
  }
  return url.toLowerCase();
}
