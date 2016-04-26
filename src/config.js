var clientService = require("./services/client");
var tokenService = require('./services/token');
var userService = require("./services/user");

var disableSecurity = ((process.env.DISABLE_SECURITY || '').toLowerCase() === 'true');
var baseUrl = process.env.BASE_URL || "https://stub-dstu2.smarthealthit.org";

module.exports = {
  fhirServer: process.env.API_SERVER || "https://fhir-open-api-dstu2.smarthealthit.org",
  baseUrl: baseUrl,
  authorizeUrl: baseUrl + (disableSecurity ? "/api/oauth/authorize" : "/authorize"),
  tokenUrl: baseUrl + "/api/oauth/token",
  jwtSecret: process.env.SECRET || "thisisasecret",
  port: process.env.PORT || "3055",
  disableSecurity: disableSecurity,
  clientService: clientService(
    process.env.CLIENT_LOOKUP_METHOD ||
    (disableSecurity ? "none" : "file")),
  tokenService: tokenService(
    process.env.TOKEN_MANAGEMENT_METHOD ||
    ("none")),
  userService: userService(
    process.env.USER_AUTHENTICATION_METHOD ||
    (disableSecurity ? "none" : "file"))
};

