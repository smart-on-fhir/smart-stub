var jwt = require("jsonwebtoken");

module.exports = function(method){
  if (method === "none" || !method){
    return NoneMethod();
  }

  throw "Unrecognized code management method: " + method;
};

function NoneMethod(){
  return {
    sign: function (params, expiresIn) {
      var config = require("../config");
      expiresIn = expiresIn || "5m";

      return jwt.sign(params, config.jwtSecret, { expiresIn: expiresIn });
    },

    verify: function (code) {
      var config = require("../config");
      var result = jwt.verify(code, config.jwtSecret);

      if (result) {
        return Promise.resolve(result);
      } else {
        return Promise.reject();
      }
    }
  };
}
