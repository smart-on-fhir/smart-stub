var querystring = require("querystring");
var url = require("url");

// This is naive. Problems include:
// 1. Can access any resource directly by ID
// 2. Can access resources by chaining
// 3. Can access resources by include
module.exports = {
  restrictQuery: function(req){
    var u = url.parse(req.url, true);
    var segments  = u
    .pathname
    .split("/")
    .filter(function(s){return !!s;});

    if (allowedResources.indexOf(segments[0]) === -1){
      throw "Not allowed to query for " + segments[0] + " resource type";
    }

    // a search operation
    if (segments.length === 1){
      if (req.token && req.token.claims){
        if (req.token.claims.scope){
          u.query._security = restrictionsOn(req.token.claims)
        }
      }
    }
    return u.pathname + url.format({query:u.query});
  }
}

function restrictionsOn(claims){
  return [ ]
  .concat(restrictedCategories(claims))
  .concat(restrictedUsers(claims));
}

function restrictedCategories(claims){
  return (claims.scope || "")
  .split(/\s+/)
  .reduce(function(scopes, scope){
    if (scope === "patient/*.read"){
      return scopes.concat(ccdsScopes);
    } else {
      return scopes;
    }
  }, ["public"]).join(",")
}

function restrictedUsers(claims){
  if (claims.patient){
    return ["public,Patient/" + claims.patient]
  } else {
    return []
  }
}

var ccdsScopes = [
  "patient",
  "medications",
  "allergies",
  "immunizations",
  "problems",
  "procedures",
  "vital-signs",
  "laboratory",
  "smoking"
]

var allowedResources = [
  "AllergyIntolerance",
  "Condition",
  "DocumentReference",
  "Encounter",
  "Immunization",
  "MedicationAdministration",
  "MedicationDispense",
  "MedicationOrder",
  "MedicationStatement",
  "Observation",
  "Patient",
  "Practitioner",
  "Procedure"
]
