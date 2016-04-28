"use strict";

var request = require("request");
var jwt = require("jsonwebtoken");
var replStream = require("replacestream");
var config = require("./config.js");

module.exports = function (req, res) {
  var token = null;

  if (req.headers.authorization) {
    token = jwt.verify(req.headers.authorization.split(" ")[1], config.jwtSecret);

    //TODO: follow oauth spec here
    if (token.exp >= new Date()) {
      return res.send("expired token", 401);
    }
  }

  var h2 = Object.assign({}, req.headers);
  delete h2["host"];
  h2["content-type"] = "application/json";

  if (req.url.match(/_format=.*json/i)) {
    h2['accept'] = "application/json+fhir";;
  } else if (req.url.match(/_format=.*xml/i)) {
    h2['accept'] = "application/xml+fhir";
  }

  var body = req.method === "POST" || req.method === "PUT" ? req.body : undefined;
  var options = {
    method: req.method,
    body: body,
    headers: h2,
    gzip: true
  };

  options.url = config.fhirServer + req.url;

  if (req.headers.authorization) {
    //this is probably too naive
    options.url += (req.url.indexOf("?") > -1 ? "&" : "?") + "patient=" + token.patient;
  }

  console.log("PROXY: " + options.url);

  var accept = options.headers['accept'];
  if (accept && accept.indexOf('json') >= 0) {
    res.type("application/json+fhir");
  } else {
    res.type("application/xml+fhir");
  }

  request(options)
  //fix absolute urls in response
  .pipe(replStream(config.fhirServer, config.baseUrl + '/api/fhir')).pipe(res);
};
