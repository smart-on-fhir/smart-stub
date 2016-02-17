var express = require("express")
var cors    = require("cors")
var path    = require("path")
var logger  = require('morgan')
var bodyParser = require('body-parser')
var smartAuthDSTU1    = require("./smart-auth-dstu1")
var smartAuthDSTU2    = require("./smart-auth-dstu2")
var reverseProxy      = require ("./reverse-proxy")

var port = (process.argv[2] || "3000")

var config = {
	fhirServer: {
		"dstu1": "https://fhir-open-api-dstu1.smarthealthit.org",
		"dstu2": "https://fhir-open-api-dstu2.smarthealthit.org"
	},
	baseUrl: 'https://stub.smarthealthit.org/smart',
	jwtSecret: "thisisasecret"
}

var app = express()

app.use(cors())
app.use(logger('dev'))

//web page to kick things off
app.get("/", (req, res) => {
	res.sendFile(path.join(__dirname, "../client/index.html"))
})

app.get("/pure-min.css", (req, res) => {
	res.sendFile(path.join(__dirname, "../client/pure-min.css"))
})

//stubs smart oauth requests
app.use( "/smart/dstu1", smartAuthDSTU1(config) )
app.use( "/smart/dstu2", smartAuthDSTU2(config) )

//reverse proxies requests to config.fhirServer and fixes urls
app.use( "/smart/dstu1", bodyParser.raw({type:'*/*'}), reverseProxy(config, 'dstu1') )
app.use( "/smart/dstu2", bodyParser.raw({type:'*/*'}), reverseProxy(config, 'dstu2') )

module.exports = app

if (!module.parent) {
	app.listen(port)
	console.log(`Proxy server running on localhost on port ${port}`)
}