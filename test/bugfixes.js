var request = require("supertest");
var app = require("../src/index.js");

describe("metadata", function() {
	it("should default to json format", function(done) {
		request(app)
			.get("/api/fhir/metadata")
				.expect("Content-Type", /json/)
				.expect(200, done);
	});
	it("should return xml if accept header is set", function(done) {
		request(app)
			.get("/api/fhir/metadata")
				.set("Accept", "application/xml+fhir")
				.expect("Content-Type", /xml/)
				.expect(200, done);
	});
	it("should return xml if format param is set", function(done) {
		request(app)
			.get("/api/fhir/metadata?_format=application/xml+fhir")
				.expect("Content-Type", /xml/)
				.expect(200, done);
	});
});

describe("reverse proxy", function() {
	it("should return 401 on bad jwt", function(done) {
		request(app)
			.get("/api/fhir/Patient")
			.set("Authorization", "badjwt")
			.expect(401, done);
	});
});

describe("token refresh", function() {
	it("should return 401 on bad jwt", function(done) {
		request(app)
			.post('/api/oauth/token/')
			.type('form')
			.send({grant_type: "authorization_code", code: "badjwt"})
			.expect(401, done);
	});
});