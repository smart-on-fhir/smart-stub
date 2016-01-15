"use strict";

var express = require("express");
var cors = require("cors");
var path = require("path");
var smartAuth = require("./smart-auth");
var reverseProxy = require("./reverse-proxy");

var port = process.argv[2] || "3000";

var config = {
	fhirServer: "https://fhir-open-api-dstu2.smarthealthit.org",
	baseUrl: "http://localhost:" + port + "/smart",
	jwtSecret: "thisisasecret"
};

var app = express();

app.use(cors());

//web page to kick things off
app.get("/", function (req, res) {
	res.sendFile(path.join(__dirname, "../client.html"));
});

//stubs smart oauth requests
app.use("/smart", smartAuth(config));

//reverse proxies requests to config.fhirServer and fixes urls
app.use("/smart", reverseProxy(config));

module.exports = app;

if (!module.parent) {
	app.listen(port);
	console.log("Proxy server running on localhost on port " + port);
}