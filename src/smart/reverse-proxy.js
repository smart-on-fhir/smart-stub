"use strict";

var request = require("request");
var jwt = require("jsonwebtoken");
var replStream = require("replacestream");
var config = require("../config.js");
var oauth = require("./oauth-helpers");

module.exports = function (req, res) {
  if (!req.token){
    return res.status(401).end();
  }
  var h2 = Object.assign({}, req.headers, {host: undefined});
  var body = req.method === "POST" || req.method === "PUT" ? req.body : undefined;
  var options = {
    method: req.method,
    body: body,
    headers: h2,
    gzip: true
  };

  options.url = config.fhirServer + req.url;

  if (req.token.claims.patient) {
    // this is naive. Problems include:
    // 1. Can access any resource directly by ID
    // 2. Can access resources by chaining
    // 3. Can access resources by include
    // ...
    if (req.url.match(/^\/(Condition|MedicationOrder|Observation|Immunization|Procedure|MedicationStatement)\/?(\?.*)?$/)) {
      options.url += (req.url.indexOf("?") > -1 ? "&" : "?") + "patient=" + req.token.claims.patient;
    }
     if (req.url.match(/^\/Patient\/?(\?.*)?$/)) {
      options.url += (req.url.indexOf("?") > -1 ? "&" : "?") + "_id=" + req.token.claims.patient;
    }
  }

  var accept = req.headers['accept'];
  if (accept && accept.indexOf('json') >= 0) {
    res.type("application/json+fhir");
  } else {
    res.type("application/xml+fhir");
  }

  //fix absolute urls in response
  request(options)
  .on('response', function(r){
    res.status(r.statusCode);
    //TODO set headers like etag
    res.set(r.headers)
    res.removeHeader("Content-Encoding")
  })
  .pipe(replStream(config.fhirServer, config.baseUrl + '/api/fhir'))
  .pipe(res);
};
