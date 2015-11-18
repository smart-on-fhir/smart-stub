var request    = require("request")
var jwt        = require("jsonwebtoken")
var replStream = require("replacestream")

module.exports = (config) => {

	//require("request").debug = true
	return (req, res) => {
		var token = null

		if (req.headers.authorization) {
			token = jwt.verify(req.headers.authorization.split(" ")[1], config.jwtSecret)
			
			//TODO: follow oauth spec here
			if (token.exp >= new Date()) {
				return res.send("expired token", 401)
			}
		}

		var h2 = Object.assign({}, req.headers)
		delete h2["host"]
		h2["content-type"] = "application/json"
		var options = {
			method: req.method, 
			body:req.body,
			headers: h2,
			gzip: true
		}

		options.url = config.fhirServer + req.url

		if (req.headers.authorization) {
			//this is probably too naive
			options.url += (req.url.indexOf("?") > -1 ? "&" : "?") +
				"patient=" + token.patient
		}

		console.log(`PROXY: ${options.url}`)

		request(options)
			//fix absolute urls in response
			.pipe(replStream(config.fhirServer, config.baseUrl))
			.pipe(res)

	}

}
