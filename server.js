require("dotenv").config();
const pino = require("pino");

const logger = pino({
    level: process.env.LOG_LEVEL || "info",
    transport: process.env.NODE_ENV !== "production"
        ? { target: "pino-pretty", options: { colorize: true } }
        : undefined
});

const WebSocketServer = require("ws").Server;

const wsPort = parseInt(process.env.WS_PORT, 10) || 7666;
const ws = new WebSocketServer({ port: wsPort });

const loadMaps = require("./loadMaps");
const loadObjs = require("./loadObjs");
const loadSpells = require("./loadSpells");

(async () => {
    const startInitialize = new Date();

    const LoadMaps = new loadMaps();
    const LoadObjs = new loadObjs();
    const LoadSpells = new loadSpells();

    await Promise.all([
        LoadMaps.initialize(),
        LoadObjs.initialize(),
        LoadSpells.initialize()
    ]);

    vars.serverReady = true;

    const endInitialize = new Date() - startInitialize;
    const textInitializeServer = `[Servidor] Iniciado en ${endInitialize}ms.`;

    logger.info(textInitializeServer);
})();

const funct = require("./functions");
const protocol = require("./protocol");
const game = require("./game");
const socket = require("./socket");
const vars = require("./vars");
const pkg = require("./package");
const npcs = require("./npcs");
const handleProtocol = require("./handleProtocol");

ws.on("connection", function(ws) {
    ws.on("message", function(res) {
        try {
            if (ws.readyState != ws.OPEN || !vars.serverReady) {
                return;
            }

            pkg.setData(res);
            protocol.handleData(ws, pkg.getPackageID());
        } catch (err) {
            funct.dumpError(err);
        }
    });

    ws.on("close", function(message) {
        try {
            socket.closePj(ws);
        } catch (err) {
            funct.dumpError(err);
        }
    });
});

setInterval(function() {
    for (var idNpc in vars.npcs) {
        var npc = vars.npcs[idNpc];

        if (
            npc.movement == 3 &&
            vars.areaNpc[idNpc].length > 0 &&
            !npc.rute.length
        ) {
            npcs.npcAttackUser(idNpc);
        }
    }
}, 650);

setInterval(function() {
    for (var idUser in vars.personajes) {
        var user = vars.personajes[idUser];

        if (user.meditar && user.mana < user.maxMana) {
            game.meditar(idUser);
        }

        if (
            user.cooldownFuerza > 0 &&
            +Date.now() - user.cooldownFuerza > vars.cooldownFA
        ) {
            user.attrFuerza = user.bkAttrFuerza;
            user.cooldownFuerza = 0;
            handleProtocol.updateFuerza(user.attrFuerza, vars.clients[idUser]);
        }

        if (
            user.cooldownAgilidad > 0 &&
            +Date.now() - user.cooldownAgilidad > vars.cooldownFA
        ) {
            user.attrAgilidad = user.bkAttrAgilidad;
            user.cooldownAgilidad = 0;
            handleProtocol.updateAgilidad(
                user.attrAgilidad,
                vars.clients[idUser]
            );
        }

        if (
            user.logout &&
            user.logout.pending &&
            user.logout.deadline > 0 &&
            vars.clients[idUser]
        ) {
            const remainingMs = user.logout.deadline - +Date.now();

            if (remainingMs <= 0) {
                game.closeForce(idUser);
                continue;
            }

            const remainingSeconds = Math.ceil(remainingMs / 1000);

            if (remainingSeconds < user.logout.lastNoticeSecond) {
                user.logout.lastNoticeSecond = remainingSeconds;
                handleProtocol.console(
                    `Deslogueando en ${remainingSeconds}...`,
                    "white",
                    0,
                    0,
                    vars.clients[idUser]
                );
            }
        }
    }
}, 500);

setInterval(function() {
    for (var idUser in vars.personajes) {
        if (vars.personajes[idUser].cerrado) {
            delete vars.personajes[idUser];
        }
    }
}, 60000);

setInterval(function() {
    game.worldSave(() => {});
}, 300000);

module.exports = { logger };
