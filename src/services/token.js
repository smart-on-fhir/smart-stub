var jwt = require('jsonwebtoken');

module.exports = function(method){
  if (method === "none" || !method){
    return NoneMethod();
  }

  throw "Unrecognized token management method: " + method;
}

function NoneMethod(){
  return {
    generate: function(client_id, scope, grant){
      var config = require('../config');
      var refresh;

      if (scope.indexOf('offline_access')  !== -1) {
        refresh = jwt.sign(Object.assign({}, grant, {grant_type: "refresh_token"}), config.jwtSecret);
      }

      var token = Object.assign({}, grant.context || {},  {
        scope: scope,
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: refresh,
        client_id: client_id
      });

      token.access_token = jwt.sign({
        grant: grant,
        claims: token
      }, config.jwtSecret, { expiresIn: "1h" });

      return token;
    },

    generateEmpty: function () {
      return jwt.sign({}, null, {algorithm: "none"});
    },

    sign: function (params, expiresIn) {
      var config = require('../config');
      expiresIn = expiresIn || "5m";

      return jwt.sign(params, config.jwtSecret, { expiresIn: expiresIn });
    },

    revoke: function (token) {
      return Promise.resolve({});
    },

    verify: function (token, jwtSecret) {
      var config = require('../config');
      var result = jwt.verify(token, config.jwtSecret);

      if (result) {
        return Promise.resolve(result);
      } else {
        return Promise.reject();
      }
    }
  }
}
