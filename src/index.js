"use strict";
var config = require("./config");

var app = module.exports = require("./server");
use in the gallery to be research (seems like it might be a stretch)? Their criteria for denial of a DUA include “the central purpose of the study is not research or evaluation”…
if (!module.parent) {
  app.listen(config.port);
  console.log("Proxy server running on localhost on port: " + config.port);
}
