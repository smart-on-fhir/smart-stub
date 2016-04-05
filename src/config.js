module.exports = {
  fhirServer: process.env.API_SERVER || "https://fhir-open-api-dstu2.smarthealthit.org",
  baseUrl: process.env.BASE_URL || 'https://stub.smarthealthit.org/smart',
  jwtSecret: process.env.SECRET || "thisisasecret",
  port: process.env.PORT || "3055"
};
