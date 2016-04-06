"use strict";
var config = require("./config");

var app = module.exports = require("./server");
if (!module.parent) {
  app.listen(config.port);
  console.log("Proxy server running on localhost on port: " + config.port);
}
