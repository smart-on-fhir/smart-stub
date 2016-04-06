var clientService = require("./client-service");
var userService = require("./user-service");

module.exports = {
  fhirServer: process.env.API_SERVER || "https://fhir-open-api-dstu2.smarthealthit.org",
  baseUrl: process.env.BASE_URL || 'https://stub-dstu2.smarthealthit.org',
  jwtSecret: process.env.SECRET || "thisisasecret",
  port: process.env.PORT || "3055",
  clientService: clientService(
    process.env.CLIENT_LOOKUP_METHOD || "file"),
  userService: userService(
    process.env.USER_AUTHENTICATION_METHOD || "file"),
};

console.log(JSON.stringify(module.exports, null, 2))

// http://172.21.0.2:3000/api/oauth/authorize?client_id=app-demo&aud=http://localhost:9000/api/fhir&launch=eyJ0eXAiOiJKV1QiLCJhbGciOiJub25lIn0%3D.eyJwYXRpZW50IjoiMTU1MTk5MiIsIm5lZWRfcGF0aWVudF9iYW5uZXIiOnRydWUsInNtYXJ0X3N0eWxlX3VybCI6Imh0dHBzOi8vZ2FsbGVyeS1zdHlsZXMuc21hcnRoZWFsdGhpdC5vcmcvc3R5bGVzL3YxLjIuMTIifQ%3D%3D.&redirect_uri=http://afterthings/authorized&state=abc
