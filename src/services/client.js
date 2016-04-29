var path = require("path");
var basicAuth = require('basic-auth');

module.exports = function(method){
  if (method === "none" || !method){
    return NoneMethod();
  }

  if (method === "file"){
    return FileMethod( path.join(__dirname, "..", "..", "defaults", "clients.json"));
  }

  throw "Unrecognized client authentication method: " + method;
}

function NoneMethod(){
  function lookup(req){
    var basic = basicAuth(req) || {};
    var id = basic.name || req.query.client_id || req.body.client_id;
    return Promise.resolve({
      client_id: id
    })
  }

  return {
    lookup: lookup,
    check: lookup
  }
}

function FileMethod(file){

  var values = require(file).reduce(
    function(coll, c){
      coll[c.client_id] = c;
      return coll;
    }, {});

    console.log("in file method", values)


    function lookup(req){
      var basic = basicAuth(req) || {};
      var id = basic.name || req.query.client_id || req.body.client_id;
      if(values[id]){
        return Promise.resolve(values[id]);
      }
      return Promise.reject("No such client: " + id);
    }

    return {
      lookup: lookup,
      check: function(req){
        return lookup(req)
        .then(function(client){
          console.log("check client secret");
          var basic = basicAuth(req);
          console.log("check client secret", client.client_secret, basic.pass);
          if (client.client_secret && client.client_secret !== basic.pass){
            return Promise.reject("Bad secret for "+ client.client_id);
          }
          return client
        });
      }
    }
}

