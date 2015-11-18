"use strict";

var express = require("express");
var cors = require("cors");
var reverseProxy = require("./reverse-proxy");
var smartAuth = require("./smart-auth");

var port = process.argv[2] || "3000";

var config = {
	fhirServer: "https://fhir-open-api-dstu2.smarthealthit.org",
	baseUrl: "http://localhost:" + port,
	jwtSecret: "thisisasecret"
};

var app = express();

app.use(cors());
app.use(smartAuth(config));
app.use(reverseProxy(config));

module.exports = app;

if (!module.parent) {
	app.listen(port);
	console.log("Proxy server running on localhost on port " + port);
}