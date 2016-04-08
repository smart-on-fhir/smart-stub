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
    headers: h2
  };

  options.url = config.fhirServer + req.url;

  if (req.token.claims.patient) {
    //this is too naive
    if (req.url.match(/^\/[^/?]+\/?(\?.*)?$/)) {
      console.log("U",req.url)
      options.url += (req.url.indexOf("?") > -1 ? "&" : "?") + "patient=" + req.token.claims.patient;
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
  })
  .pipe(replStream(config.fhirServer, config.baseUrl + '/api/fhir'))
  .pipe(res);
};
