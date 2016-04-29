var clientService = require("./services/client");
var codeService = require("./services/code");
var databaseService = require("./services/database");
var tokenService = require("./services/token");
var userService = require("./services/user");

var disableSecurity = ((process.env.DISABLE_SECURITY || "").toLowerCase() === "true");
var baseUrl = process.env.BASE_URL || "https://stub-dstu2.smarthealthit.org";

var sqlitePath = process.env.SQLITE_PATH || "db.sqlite3";

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
  databaseService: databaseService(
    process.env.DATABASE_METHOD || "sqlite", sqlitePath),
  codeService: codeService(
    process.env.CODE_MANAGEMENT_METHOD || "none"),
  tokenService: tokenService(
    process.env.TOKEN_MANAGEMENT_METHOD ||
    (disableSecurity ? "none" : "sqlite")),
  userService: userService(
    process.env.USER_AUTHENTICATION_METHOD ||
    (disableSecurity ? "none" : "file"))
};

