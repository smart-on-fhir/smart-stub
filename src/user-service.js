var path = require("path");

module.exports = function(method){
  if (method === "none" || !method){
    return NoneMethod();
  }

  if (method === "file"){
    return FileMethod(
      process.env.CLIENT_DEFINITIONS_FILE ||
        path.join(__dirname, "..", "defaults", "users.json"));
  }

  throw "Unrecognized user authentication method: " + method;
}

function NoneMethod(){
  return {
    check: function(username, password){
      return Promise.resolve({
        username: "default"
      })
    }
  }
}

function FileMethod(file){

  var values = require(file).reduce(
    function(coll, c){
      coll[c.username] = c;
      return coll;
    }, {});

  return {
    check: function(username, password){
      if (!values[username]){
        return Promise.reject("No such client: " + username);
      }
      if (values[username].password !== password){
        return Promise.reject("Bad password for "+ username);
      }
      return Promise.resolve(values[username]);
    }
  }
}
