"use strict";

var request = require("request");
var jwt = require("jsonwebtoken");
var replStream = require("replacestream");
var config = require("../config.js");
var oauth = require("./oauth-helpers");
var security = require("../services/security");

module.exports = function (req, res) {
  if (!req.token && !config.disableSecurity){
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

  options.url = config.fhirServer + security.restrictQuery(req);
  console.log("OPTS", options.url)

  //fix absolute urls in response
  console.log("Reverse proxy to", options);
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
