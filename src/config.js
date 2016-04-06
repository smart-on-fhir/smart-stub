var clientService = require("./client-service");
var userService = require("./user-service");

module.exports = {
  fhirServer: process.env.API_SERVER || "https://fhir-open-api-dstu2.smarthealthit.org",
  baseUrl: process.env.BASE_URL || 'https://stub-dstu2.smarthealthit.org',
  jwtSecret: process.env.SECRET || "thisisasecret",
  port: process.env.PORT || "3055",
  clientService: clientService(
    process.env.CLIENT_LOOKUP_METHOD || "file"), // "file" or "none"
  userService: userService(
    process.env.USER_AUTHENTICATION_METHOD || "file"), // "file" or "none"
};

