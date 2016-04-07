var clientService = require("./services/client");
var userService = require("./services/user");

module.exports = {
  fhirServer: process.env.API_SERVER || "https://fhir-open-api-dstu2.smarthealthit.org",
  baseUrl: process.env.BASE_URL || "https://stub-dstu2.smarthealthit.org",
  jwtSecret: process.env.SECRET || "thisisasecret",
  port: process.env.PORT || "3055",
  disableSecurity: process.env.DISABLE_SECURITY || false,
  clientService: clientService(
    process.env.CLIENT_LOOKUP_METHOD ||
    (process.env.DISABLE_SECURITY ? "none" : "file")),
  userService: userService(
    process.env.USER_AUTHENTICATION_METHOD ||
    (process.env.DISABLE_SECURITY ? "none" : "file"))
};

