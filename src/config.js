module.exports = {
  fhirServer: process.env.API_SERVER || "https://sb-fhir-dstu2.smarthealthit.org/api/smartdstu2/open",
  baseUrl: process.env.BASE_URL || "http://localhost:3055",
  jwtSecret: process.env.SECRET || "thisisasecret",
  port: process.env.PORT || "3055"
};
