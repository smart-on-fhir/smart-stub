var config = require('../config');
var jwt = require('jsonwebtoken');

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
      req.grant = ensureValidJwt(req.body.code);
      req.grant.grant_type = grantType;
      return next();
    } else if (grantType === 'refresh_token') {
      req.grant = ensureValidJwt(req.body.refresh_token);
      req.grant.grant_type = grantType;
      return next();
    } else {
      return next();
    }
  },

  populateAuthentications: function(req, res, next){
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
  },

  signedCode: function(params){
    if(!params.client_id){
      throw "Need a client id in " + params;
    }
    if(!params.scope){
      throw "Need a scope in " + params;
    }
    return jwt.sign(params, config.jwtSecret, { expiresIn: "5m" });
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

  ensureValidJwt: ensureValidJwt,

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
    req.token = ensureValidJwt(req.headers.authorization.split("Bearer ")[1]);
    next()
  },

  ensureScope: function(target){
    return function(req, res, next){
      if (config.disableSecurity){
        return next()
      }

      console.log("Eval scopes", req.token)
      if (req.token.claims.scope.split(/\s+/).filter(function(s){ return s === target; }).length !== 1){
        return next(token.scope + " doesn't have one element = " + target);
      }
      return next();
    }
  },

  createEmptyJwt: function(){
    return jwt.sign({}, null, {algorithm: "none"} )
  }
}

function normalizeURL(url) {
  if (url.match(/\/$/)) {
    url = url.substring(0, url.length - 1);
  }
  return url.toLowerCase();
}


function ensureValidJwt(token){
  var result = jwt.verify(token, config.jwtSecret);
  return result;
}


