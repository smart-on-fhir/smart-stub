var jwt = require("jsonwebtoken");

module.exports = function(method){
  if (method === "none" || !method){
    return NoneMethod();
  }
  if (method === "sqlite") {
    return SqliteMethod();
  }

  throw "Unrecognized token management method: " + method;
};

/**
 * NoneMethod uses straight JWT verification and has no storage backing.
 */
function NoneMethod(){
  return {
    /**
     * Generate a JWT.
     *
     * @param {object} grant Grant request.
     * @param {string} grant.client_id This is the client_id we"re generating
     *    for.
     * @param {string} grant.scope What this token should be able to access.
     *    Should be in the format "patient/*.read".
     * @returns {Promise}
     */
    generate: function(grant){
      var config = require("../config");
      var refresh;
      var scope = grant.scope;
      var client_id = grant.client_id;

      if (scope.indexOf("offline_access") !== -1) {
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

      return Promise.resolve(token);
    },

    /**
     * Revoke a JWT.
     *
     * @param {string} token The token to be revoked.
     * @param {string} [tokenType] The type of token to be revoked.
     *    Should of "access_token" or "refresh_token".
     * @returns {Promise}
     */
    revoke: function (token, tokenType) {
      return Promise.resolve({});
    },

    /**
     * Verify a JWT.
     *
     * @param {string} token The token to be verified.
     * @returns {Promise}
     */
    verify: function (token) {
      var config = require("../config");
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
  // Use the None method as a "naive" implementation so that we can re-use
  // basic JWT handling logic.
  var naive = NoneMethod();

  return {
    generate: function (grant) {
      var generatedToken;

      // First generate a JWT using the naive implementation
      return naive.generate(grant)
      // Verifying it is an easy way to generate initialized and expiration times
      .then(function (token) {
        generatedToken = token;

        return naive.verify(token.access_token);
      })
      // Store the generated token in the database
      .then(function (verified) {
        var config = require("../config");
        var db = config.databaseService;

        return Promise.all([
          db.run(
            "INSERT INTO refresh_token VALUES (?, ?)",
            generatedToken.client_id,
            generatedToken.refresh_token
          ),
          db.run(
            "INSERT INTO access_token VALUES (?, ?, ?)",
            generatedToken.access_token,
            verified.iat,
            verified.exp
          )
        ]);
      })
      // Calling code expects a promise with a generated token, not the output
      // of a SQL insert.
      .then(function () {
        return generatedToken;
      });
    },

    revoke: function (token) {
      var config = require("../config");
      var db = config.databaseService;

      // Delete the token if we've got it
      return db.run("DELETE FROM access_token WHERE access_token = ?", token);
    },

    verify: function (token) {
      var verifiedToken;

      // First verify the provided token using the naive implementation
      return naive.verify(token)
      // Then make sure it still exists in the database and hasn't expired
      .then(function (verified) {
        var config = require("../config");
        var db = config.databaseService;
        var query = [
          "SELECT 1 FROM access_token WHERE access_token = $token",
          "SELECT 1 FROM refresh_token WHERE refresh_token = $token"
        ].join(" UNION ");

        verifiedToken = verified;

        return db.get(query, {"$token": token});
      })
      // The calling code expects a "verified" output, not the result of a SQL query
      .then(function () {
        return verifiedToken;
      });
    }
  };
}
