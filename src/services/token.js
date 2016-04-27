var jwt = require('jsonwebtoken');
var sqlite3 = require('sqlite3').verbose();

module.exports = function(method){
  if (method === "none" || !method){
    return NoneMethod();
  }
  if (method === "sqlite") {
    return SqliteMethod();
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

    verify: function (token) {
      var config = require('../config');
      var result = jwt.verify(token, config.jwtSecret);

      if (result) {
        return Promise.resolve(result);
      } else {
        return Promise.reject();
      }
    }
  };
}

function SqliteMethod() {
  var naive = NoneMethod();
  var _db;

  function dbFactory() {
    var config = require('../config');

    if (_db) {
      return _db;
    }

    var db = _db = new sqlite3.Database(config.sqlitePath);
    db.serialize();

    var columns = [
      'client_id TEXT',
      'access_token TEXT',
      'refresh_token TEXT',
      'iat INTEGER',
      'exp INTEGER'
    ];
    db.run('CREATE TABLE IF NOT EXISTS token (' + columns.join(', ') + ')');

    return db;
  }

  return {
    generate: function (client_id, scope, grant) {
      var token = naive.generate(client_id, scope, grant);

      naive.verify(token.access_token)
      .then(function (verified) {
        var db = dbFactory();
        var stmt = db.prepare('INSERT INTO token VALUES (?, ?, ?, ?, ?)');

        stmt.run(
          token.client_id,
          token.access_token,
          token.refresh_token,
          verified.iat,
          verified.exp
        );
        stmt.finalize();
      });

      return token;
    },

    generateEmpty: function () {
      return naive.generateEmpty();
    },

    sign: function (params, expiresIn) {
      return naive.sign(params, expiresIn);
    },

    revoke: function (token) {
      var db = dbFactory();

      db.run('DELETE FROM token WHERE access_token = ?', token);

      return Promise.resolve({});
    },

    verify: function (token) {
      var exists = new Promise(function (resolve, reject) {
          var db = dbFactory();
          var stmt = db.prepare('SELECT * FROM token WHERE access_token = ? AND exp > ?');
          var now = Math.floor(Date.now() / 1000);

          stmt.get(token, now, function (err, row) {
            if (row) {
              resolve(row);
            } else {
              reject(err);
            }
          });
          stmt.finalize();
      });

      return Promise.all([naive.verify(token), exists]);
    }
  };
}
