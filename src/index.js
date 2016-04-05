"use strict";

var express = require("express");
var cors = require("cors");
var path = require("path");
var logger = require('morgan');
var bodyParser = require('body-parser');
var smartAuth = require("./smart-auth");
var smartMetadata = require("./smart-metadata");
var reverseProxy = require("./reverse-proxy");

var port = process.argv[2] || "3055";

var app = express();

app.use(cors());
app.use(logger('dev'));

//stubs smart oauth requests
app.use("/api/oauth", smartAuth);

app.use("/api/fhir", smartMetadata);
app.use(
  "/api/fhir",
  bodyParser.raw({ type: '*/*' }),
  reverseProxy);

app.use(express.static('static'));

module.exports = app;

if (!module.parent) {
  app.listen(port);
  console.log("Proxy server running on localhost on port " + port);
}
