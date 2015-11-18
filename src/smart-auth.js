var jwt        = require("jsonwebtoken")
var bodyParser = require("body-parser")
var router     = require("express").Router()

var metadata   = require("../metadata.json")

module.exports = (config) => {

	router.get("/metadata", (req, res) => {
		//TODO: handle xml metadata requests
		metadata.rest[0].security.extension[0] = {
	      "url": "http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris",
		  "extension": [{
	        "url": "authorize",
	        "valueUri": config.baseUrl + "/authorize"
	      },{
	        "url": "token",
	        "valueUri": config.baseUrl + "/token"
	      }]
		}
		res.type("application/json+fhir")
		res.send(metadata)
	})

	router.get("/authorize", (req, res) => {
		if (req.query.aud != config.baseUrl) {
			//TODO: follow oauth spec here
			return res.send("Bad audience value", 400)
		}
		var incomingJwt = req.query.launch.replace(/=/g, "")
		var code = {
			context: jwt.decode(incomingJwt),
			client_id: req.query.client_id,
			scope: req.query.scope
		}
		var state = req.query.state
		var signedCode = jwt.sign(code, config.jwtSecret, {expiresIn: "5m"})
		res.redirect(req.query.redirect_uri + `?code=${signedCode}&state=${state}`)
	})

	router.post("/token", bodyParser.urlencoded({extended: false}), (req, res) => {
		var code = jwt.verify(req.body.code, config.jwtSecret)

		var token = Object.assign({}, code.context, {
			token_type: "bearer",
			expires_in: 3600,
			scope: code.scope, 
			client_id: req.body.client_id
		})
		token.access_token = jwt.sign(Object.assign({}, token), config.jwtSecret, {expiresIn: "1h"})
		res.json(token)
	})

	return router

}
