var assert = require("assert");
var url = require("url");
var jwt = require("jsonwebtoken");
var bodyParser = require("body-parser");
var router = require("express").Router();
var config = require("../config");
var oauth = require("./oauth-helpers");

if (!Object.assign) {
  Object.assign = require("object-assign");
}

module.exports = router;

var lookups = [
  oauth.populateUnauthenticatedClient,
  oauth.populateAuthentications,
  oauth.populateGrants,
  oauth.populateToken
];

var jsonParser = bodyParser.json();


/*
  * Create an authorization code. This is for a trusted static front-end to call,
  * as indicated by the "smart/portal" scope. In general, only "we" call this;
  * other apps don't.
  *
  * The POSTed body is a JSON object like:
  * {
  *   client_id: <string> (which client is this authorization granted to),
  *   scope: <string> (which scopes are being granted to the client),
  *   context: { (these values will appear directly on the final access token)
  *      patient: <string> (patient in-context for this authorization),
  *      encounter: <string> (encounter in-context for this authorization)
  *      ... arbitrary key/value pairs can go here.
  *   }
  *
  * }
  */
router.post("/code", jsonParser, lookups, oauth.ensureScope("smart/portal"), function(req, res, next){
  assert(!config.disableSecurity);
  var claims = {
    user: req.token.grant.user,
    grant_type: "authorization_code",
    client_id: req.body.client_id,
    scope: req.body.scope,
    context: Object.assign({}, req.body.context || {}, {
      patient: req.token.grant.user.split("/")[1]
    }),
    request: req.body
  };
  res.json({
    code: oauth.signedCode(claims)
  });
});

router.get("/client", lookups, oauth.ensureScope("smart/portal"), function(req, res, next){
  res.json({
    client_id: req.unauthenticatedClient.client_id,
    client_name: req.unauthenticatedClient.client_name,
    client_uri: req.unauthenticatedClient.client_uri,
    redirect_uris: req.unauthenticatedClient.redirect_uris,
    logo_uri: req.unauthenticatedClient.logo_uri
  });
});


/* Auto-authorize with no UI, for non-verifying mode only
 *
 * This endpoint can only be called in "disableSecurity" mode.
 * The endpoint uses query parameters:
 *
 *  `launch`: an unsigned (algorithm: "none") JWT containing a payload with:
 *  {
 *    "context": {
 *      "patient": <string>(Patient in context for this launch)
 *      ... arbitrary key/value pairs of launch context to appear in access token
 *    }
 *  }
 */
router.get("/authorize", lookups, function (req, res, next) {

  assert(config.disableSecurity);
  oauth.ensureValidAudience(req.query.aud);

  var launchJwt = jwt.decode(req.query.launch && req.query.launch.replace(/=/g, "") || jwt.sign({}, null, {algorithm: "none"}));

  var claims = {
    grant_type: "authorization_code",
    client_id: req.query.client_id,
    scope: req.query.scope,
    context: launchJwt.context || {}
  };

  var state = req.query.state;
  var signedCode = config.codeService.sign(claims);

  var query = {
    code: signedCode,
    state: state
  };

  res.redirect(req.query.redirect_uri + url.format({query: query}));
});


/*
 * Generic token generator. Requires the presence of a valid grant (e.g. resource owner credentials, or authz code)
 * Logically, a grant includes the following elements:
 *
 *   grant_type: <string> (an OAuth grant type, like "password", "authorization_code", or "refresh_token"),
 *   user: <string> (which user is responsible for the grant if any),
 *   client_id: <string> (which client is this authorization granted to),
 *   scope: <string> (which scopes are being granted to the client),
 *   context: { (these values will appear directly on the final access token)
 *      patient: <string> (patient in-context for this authorization),
 *      encounter: <string> (encounter in-context for this authorization)
 *      ... arbitrary key/value pairs can go here.
 *   }
 */
router.post("/token", bodyParser.urlencoded({ extended: false }), lookups, function (req, res, next) {
  var grant = req.grant;

  if (req.unauthenticatedClient.client_secret && req.authentication.none){
    throw "Can't get token without an authentication";
  }

  if (req.unauthenticatedClient && req.authentication.client){
    assert(req.unauthenticatedClient === req.authentication.client);
  }

  config.tokenService.generate(grant)
  .then(function (token) {
    if (grant.client_id  !== req.unauthenticatedClient.client_id) {
      throw "Client ID mismatch: " + grant.client_id + " vs. " + req.unauthenticatedClient.client_id;
    }

    res.json(token);
  })
  .catch(next);
});

/**
 * Revoke a previously generated token.
 * Revoking requires the following parameters:
 *
 *  token       REQUIRED  The token that the client wants to get revoked.
 *  token_type  OPTIONAL  A hint about the type of the token submitted for
 *                        revocation.
 */
router.post("/revoke", bodyParser.urlencoded({ extended: false }), lookups, function (req, res, next) {
  var token = req.body.token;
  var token_type = req.body.token_type;

  var valid_types = ["access_token", "refresh_token"];

  if (typeof token_type === "undefined") {
    token_type = "access_token";
  }

  if (valid_types.indexOf(token_type) < 0) {
    throw "Unsupported token type";
  }

  config.tokenService.revoke(token, token_type)
  .then(function () {
    res.json({});
  })
  .catch(next);
});
