"use strict";

var request = require("request");
var jwt = require("jsonwebtoken");
var replStream = require("replacestream");
var config = require("./config.js");

module.exports = function (req, res) {
  var token = null;

  if (req.headers.authorization) {
    try {
      token = jwt.verify(req.headers.authorization.split(" ")[1], config.jwtSecret);
    } catch (e) {
      return res.status(401).send("invalid token");
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

  if (req.headers.authorization && token.scope.indexOf("user/") < 0) {
    //this is probably too naive
    if (options.url.toLowerCase().search("patient") < 0) {
       options.url += (req.url.indexOf("?") > -1 ? "&" : "?") + "patient=" + token.patient;
    }
  }

  delete options.headers.authorization;

  console.log("PROXY: " + options.url);

  request(options)
  .on('response', function(response) {
     var contentType = response.headers['content-type'];
     res.status(response.statusCode);
     contentType && res.type(contentType);
  })
  //fix absolute urls in response
  .pipe(replStream(config.fhirServer, config.baseUrl + '/api/fhir')).pipe(res);
};
