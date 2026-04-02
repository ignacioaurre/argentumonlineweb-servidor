var fs = require("fs");
var funct = require("./functions");
var socket = require("./socket");
var vars = require("./vars");
var handleProtocol = require("./handleProtocol");

var game = {};

require("./game/players")(game);
require("./game/movement")(game);
require("./game/items")(game);
require("./game/combat")(game);
require("./game/spells")(game);
require("./game/meditation")(game);
require("./game/npc")(game);

module.exports = game;
