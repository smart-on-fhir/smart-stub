"use strict";

var router = require("express").Router();
var request = require('request');
var xml2js = require('xml2js');
var config = require('../config');


var metadataUrl = config.fhirServer + "/metadata";
var jsonConformance;
var xmlConformance;

module.exports = router;
router.get("/metadata", function (req, res) {
  if (req.headers.accept.indexOf('json') >= 0) {
    res.type("application/json+fhir");
    res.send(jsonConformance);
  } else {
    res.type("application/xml+fhir");
    res.send(xmlConformance);
  }
});


request({
  url: metadataUrl,
  json: true
}, function (error, response, body) {
  console.log("Getting metadata", response.statusCode);
  if (!error && response.statusCode === 200) {
    var conformance = body;
    if (!conformance.rest[0].security){
      conformance.rest[0].security = {}
    }
    conformance.rest[0].security['extension'] = [{
      "url": "http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris",
      "extension": [{
        "url": "authorize",
        "valueUri": config.authorizeUrl
      }, {
        "url": "token",
        "valueUri": config.tokenUrl
      }]
    }];
    jsonConformance = JSON.stringify(conformance, null, 2).replace(
      config.fhirServer,
      config.baseUrl+'/api/fhir')
  }
});

request({
  url: metadataUrl,
  headers: {
    'Accept': 'application/xml+fhir'
  }
}, function (error, response, body) {
  if (!error && response.statusCode === 200) {
    var parseString = xml2js.parseString;
    parseString(body, function (err, result) {
      if (!result.Conformance.rest[0].security){
        result.Conformance.rest[0].security = [{}]
      }
      result.Conformance.rest[0].security[0]['extension'] = [{
        "$": {
          "url": "http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris"
        },
        "extension": [{
          "$": {
            "url": "authorize"
          },
          "valueUri": [{
            "$": {
              "value": config.authorizeUrl
            }
          }]
        }, {
          "$": {
            "url": "token"
          },
          "valueUri": [{
            "$": {
              "value": config.tokenUrl
            }
          }]
        }]
      }];

      var builder = new xml2js.Builder();
      var xml = builder.buildObject(result);
      xmlConformance = xml.replace(config.fhirServer, config.baseUrl + '/api/fhir')
    });
  }
});
