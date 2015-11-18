"use strict";

var request = require("request");
var jwt = require("jsonwebtoken");
var replStream = require("replacestream");

module.exports = function (config) {

	//require('request').debug = true
	return function (req, res) {
		var token = jwt.verify(req.headers.authorization.split(" ")[1], config.jwtSecret);

		//TODO: follow oauth spec here
		if (token.exp >= new Date()) {
			return res.send("expired token", 401);
		}

		var h2 = Object.assign({}, req.headers);
		delete h2["host"];
		var options = {
			method: req.method,
			body: req.body,
			headers: h2,
			gzip: true
		};

		//this is probably too naive
		options.url = config.fhirServer + req.url + (req.url.indexOf("?") > -1 ? "&" : "?") + "patient=" + token.patient;

		console.log("PROXY: " + options.url);

		request(options)
		//fix absolute urls in response
		.pipe(replStream(config.fhirServer, config.baseUrl)).pipe(res);
	};
};