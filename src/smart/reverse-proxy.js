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
  var h2 = Object.assign({}, req.headers);
  delete h2["host"];
  h2["content-type"] = "application/json";
  var body = req.method === "POST" || req.method === "PUT" ? req.body : undefined;
  var options = {
    method: req.method,
    body: body,
    headers: h2,
    gzip: true
  };

  options.url = config.fhirServer + req.url;

  if (req.token.claims.patient) {
    //this is probably too naive
    options.url += (req.url.indexOf("?") > -1 ? "&" : "?") + "patient=" + req.token.claims.patient;
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
    res.writeHead(r.statusCode, r.headers);
  })
  .pipe(replStream(config.fhirServer, config.baseUrl + '/api/fhir'))
  .pipe(res);
};
