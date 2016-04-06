"use strict";

var express = require("express");
var cors = require("cors");
var path = require("path");
var logger = require('morgan');
var bodyParser = require('body-parser');
var smartAuth = require("./smart-auth");
var smartMetadata = require("./smart-metadata");
var reverseProxy = require("./reverse-proxy");
var config = require("./config");

var app = express();
module.exports = app;

app.use(cors());
app.use(logger('dev'));

app.use("/api/oauth", smartAuth);
app.use("/api/fhir", smartMetadata);
app.use("/api/fhir", bodyParser.raw({ type: '*/*' }), reverseProxy);
app.use(express.static('static'));

if (!module.parent) {
  app.listen(config.port);
  console.log("Proxy server running on localhost on port: " + config.port);
}
