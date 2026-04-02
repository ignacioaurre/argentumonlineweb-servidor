var vars = require("../vars");
var funct = require("../functions");
var handleProtocol = require("../handleProtocol");
var socket = require("../socket");

module.exports = function addPlayersMethods(game) {
    game.isSafeZone = function(user) {
        try {
            if (!user || !vars.mapData[user.map] || !vars.mapa[user.map]) {
                return true;
            }

            const mapInfo = vars.mapData[user.map];

            if (mapInfo.pk) {
                return true;
            }

            return false;
        } catch (err) {
            funct.dumpError(err);
            return true;
        }
    };

    game.cancelLogout = function(idUser, message) {
        try {
            const user = vars.personajes[idUser];

            if (!user || !user.logout || !user.logout.pending) {
                return;
            }

            user.logout.pending = false;
            user.logout.deadline = 0;
            user.logout.lastNoticeSecond = 0;

            if (message && vars.clients[idUser]) {
                handleProtocol.console(
                    message,
                    "white",
                    0,
                    0,
                    vars.clients[idUser]
                );
            }
        } catch (err) {
            funct.dumpError(err);
        }
    };

    game.requestLogout = function(ws) {
        try {
            const user = vars.personajes[ws.id];

            if (!user) {
                socket.close(ws);
                return;
            }

            if (game.isSafeZone(user)) {
                game.closeForce(ws.id);
                return;
            }

            if (user.logout && user.logout.pending) {
                handleProtocol.console(
                    "El cierre de sesión ya está en curso.",
                    "white",
                    0,
                    0,
                    ws
                );
                return;
            }

            user.logout = {
                pending: true,
                deadline: +Date.now() + 10000,
                lastNoticeSecond: 10
            };

            handleProtocol.console(
                "Deslogueando en 10 segundos. Se cancelará si te mueves, atacas o eres atacado.",
                "white",
                0,
                0,
                ws
            );
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [getName Devuelve el nombre del usuario o npc]
     * @param  {number} id [description]
     * @return {String}    [description]
     */
    game.getName = function(id) {
        try {
            var pjSelected = vars.personajes[id];

            if (!pjSelected) {
                pjSelected = vars.npcs[id];
            }

            return pjSelected.nameCharacter;
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [isBanned Devuelve si el usuario está baneado]
     * @param  {object}  pj [description]
     * @return {Boolean}    [description]
     */
    game.isBanned = function(pj) {
        try {
            var date = new Date();
            if (pj.banned < date || pj.banned === 0) {
                return false;
            } else {
                return true;
            }
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [existPj Devuelve si el personaje existe o no]
     * @param  {number} id [description]
     * @return {Boolean}    [description]
     */
    game.existPj = function(id) {
        try {
            if (vars.personajes[id]) {
                return true;
            } else {
                return false;
            }
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [existPjOrClose Si el personaje no existe cierra la conexión]
     * @param  {object} ws [description]
     * @return {Boolean}    [description]
     */
    game.existPjOrClose = function(ws) {
        try {
            if (ws.readyState == ws.OPEN) {
                if (ws.id) {
                    if (vars.personajes[ws.id]) {
                        return true;
                    } else {
                        console.log("ID desconectada: " + ws.id);
                        socket.close(ws);
                        return false;
                    }
                } else {
                    console.log("WS desconectado");
                    socket.close(ws);
                    return false;
                }
            } else {
                console.log("WS desconectado por diferente state");
                socket.close(ws);
                return false;
            }
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [worldSave Guardado del mundo]
     * @param  {Function} callback [description]
     * @return {}            [description]
     */
    game.worldSave = async callback => {
        try {
            for (var i in vars.personajes) {
                var user = vars.personajes[i];
                if (!user.pvpChar) {
                    user.map = user.map || 1;
                    user.posX = user.pos.x;
                    user.posY = user.pos.y;
                    user.connected = false;

                    let tmpSpells = [];
                    Object.keys(user.spells).map(idPos => {
                        tmpSpells.push({
                            idPos: idPos,
                            idSpell: user.spells[idPos].idSpell
                        });
                    });

                    let tmpItems = [];
                    Object.keys(user.inv).map(idPos => {
                        const item = user.inv[idPos];

                        tmpItems.push({
                            idPos: idPos,
                            idItem: item.idItem,
                            cant: item.cant,
                            equipped: item.equipped
                        });
                    });

                    user.spells = tmpSpells;
                    user.items = tmpItems;
                    user.updatedAt = new Date();

                    const characterSave = await funct.fetchUrl(
                        `/character_save/${user._id}`,
                        {
                            method: "PUT",
                            body: JSON.stringify(user),
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: vars.tokenAuth
                            }
                        }
                    );
                }
            }

            callback(true);
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [checkUserLevel description]
     * @param  {[type]} idUser [description]
     * @return {[type]}        [description]
     */
    game.checkUserLevel = function(idUser) {
        try {
            var user = vars.personajes[idUser];

            var client = vars.clients[idUser];

            if (user.exp < user.expNextLevel) {
                handleProtocol.actExp(user.exp, client);
                return;
            }

            while (user.exp >= user.expNextLevel) {
                if (user.level >= 42) {
                    break;
                }

                user.level++;
                user.exp -= user.expNextLevel;

                if (user.level < 15) {
                    user.expNextLevel *= 1.4;
                } else if (user.level < 21) {
                    user.expNextLevel *= 1.35;
                } else if (user.level < 33) {
                    user.expNextLevel *= 1.3;
                } else if (user.level < 41) {
                    user.expNextLevel *= 1.225;
                } else {
                    user.expNextLevel *= 1.25;
                }

                aumentoHP = vars.modVida[user.attrConstitucion][user.idClase];

                var aumentoHIT = 0;
                var aumentoMana = 0;

                switch (user.idClase) {
                    case vars.clases.guerrero:
                        if (user.level > 35) {
                            aumentoHIT = 2;
                        } else {
                            aumentoHIT = 3;
                        }
                        break;

                    case vars.clases.cazador:
                        if (user.level > 35) {
                            aumentoHIT = 2;
                        } else {
                            aumentoHIT = 3;
                        }
                        break;

                    case vars.clases.pirata:
                        aumentoHIT = 3;
                        break;

                    case vars.clases.paladin:
                        if (user.level > 35) {
                            aumentoHIT = 1;
                        } else {
                            aumentoHIT = 3;
                        }

                        aumentoMana = user.attrInteligencia;
                        break;

                    case vars.clases.mago:
                        aumentoHIT = 1;

                        aumentoMana = 2.8 * user.attrInteligencia;
                        break;

                    case vars.clases.trabajador:
                        aumentoHIT = 2;
                        break;

                    case vars.clases.clerigo:
                        aumentoHIT = 2;

                        aumentoMana = 2 * user.attrInteligencia;
                        break;

                    case vars.clases.druida:
                        aumentoHIT = 2;

                        aumentoMana = 2 * user.attrInteligencia;
                        break;

                    case vars.clases.asesino:
                        if (user.level > 35) {
                            aumentoHIT = 1;
                        } else {
                            aumentoHIT = 3;
                        }

                        aumentoMana = user.attrInteligencia;
                        break;

                    case vars.clases.bardo:
                        aumentoHIT = 2;

                        aumentoMana = 2 * user.attrInteligencia;
                        break;

                    default:
                        aumentoHIT = 2;
                }

                aumentoMana = parseInt(aumentoMana);
                aumentoHP = parseInt(aumentoHP);

                user.maxHp += aumentoHP;
                user.hp = user.maxHp;
                user.maxMana += aumentoMana;

                user.minHit += aumentoHIT;
                user.maxHit += aumentoHIT;

                handleProtocol.console(
                    "¡Has subido a nivel " + user.level + "!",
                    "red",
                    1,
                    0,
                    client
                );

                handleProtocol.console(
                    "¡Has ganado " + aumentoHP + " puntos de vida!",
                    "red",
                    1,
                    0,
                    client
                );

                if (aumentoMana) {
                    handleProtocol.console(
                        "¡Has ganado " + aumentoMana + " puntos de maná!",
                        "red",
                        1,
                        0,
                        client
                    );
                }

                handleProtocol.console(
                    "¡Tu golpe máximo aumento en " + aumentoHIT + " puntos!",
                    "red",
                    1,
                    0,
                    client
                );
                handleProtocol.console(
                    "¡Tu golpe mínimo aumento en " + aumentoHIT + " puntos!",
                    "red",
                    1,
                    0,
                    client
                );

                handleProtocol.actMyLevel(idUser, client);
            }
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [revivirUsuario description]
     * @param  {[type]} idUser [description]
     * @return {[type]}        [description]
     */
    game.revivirUsuario = function(idUser) {
        try {
            var user = vars.personajes[idUser];

            user.idBody = game.bodyNaked(idUser);
            user.idHead = user.idLastHead;
            user.hp = user.maxHp;
            user.dead = 0;

            handleProtocol.updateHP(user.hp, vars.clients[idUser]);

            game.loopArea(vars.clients[idUser], function(target) {
                if (!target.isNpc) {
                    handleProtocol.revivirUsuario(
                        idUser,
                        vars.clients[target.id]
                    );
                }
            });
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [putBodyAndHeadDead description]
     * @param  {[type]} idUser [description]
     * @return {[type]}        [description]
     */
    game.putBodyAndHeadDead = function(idUser) {
        try {
            var user = vars.personajes[idUser];

            if (!user.navegando) {
                user.idLastHead = JSON.parse(user.idHead);
                user.idBody = 8;
                user.idHead = 500;
            } else {
                user.idBody = 87;
            }

            user.idWeapon = 0;
            user.idHelmet = 0;
            user.idShield = 0;
            user.dead = 1;

            user.idLastHelmet = 0;
            user.idLastWeapon = 0;
            user.idLastShield = 0;

            user.idItemBody = 0;
            user.idItemWeapon = 0;
            user.idItemArrow = 0;
            user.idItemShield = 0;
            user.idItemHelmet = 0;

            for (var idSlot in user.inv) {
                user.inv[idSlot].equipped = 0;
            }

            game.loopArea(vars.clients[idUser], function(target) {
                if (!target.isNpc) {
                    handleProtocol.putBodyAndHeadDead(
                        idUser,
                        vars.clients[target.id]
                    );
                }
            });
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [bodyNaked description]
     * @param  {[type]} idUser [description]
     * @return {[type]}        [description]
     */
    game.bodyNaked = function(idUser) {
        try {
            var user = vars.personajes[idUser],
                $idBody = 0;

            if (user.idGenero == vars.genero.hombre) {
                switch (user.idRaza) {
                    case vars.razas.humano:
                        $idBody = 21;
                        break;

                    case vars.razas.elfo:
                        $idBody = 210;
                        break;

                    case vars.razas.elfoDrow:
                        $idBody = 32;
                        break;

                    case vars.razas.enano:
                        $idBody = 53;
                        break;

                    case vars.razas.gnomo:
                        $idBody = 222;
                        break;
                }
            }

            if (user.idGenero == vars.genero.mujer) {
                switch (user.idRaza) {
                    case vars.razas.humano:
                        $idBody = 39;
                        break;

                    case vars.razas.elfo:
                        $idBody = 259;
                        break;

                    case vars.razas.elfoDrow:
                        $idBody = 40;
                        break;

                    case vars.razas.enano:
                        $idBody = 60;
                        break;

                    case vars.razas.gnomo:
                        $idBody = 260;
                        break;
                }
            }

            return $idBody;
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [closeForce description]
     * @param  {[type]} idUser [description]
     * @return {[type]}        [description]
     */
    game.closeForce = function(idUser) {
        try {
            handleProtocol.closeForce(idUser);

            socket.close(vars.clients[idUser]);
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [hacerCriminal description]
     * @param  {[type]} idUser [description]
     * @return {[type]}        [description]
     */
    game.hacerCriminal = function(idUser) {
        try {
            var user = vars.personajes[idUser];

            user.criminal = 1;
            user.color = "red";

            game.loopArea(vars.clients[idUser], function(client) {
                if (!client.isNpc) {
                    handleProtocol.actColorName(
                        idUser,
                        "red",
                        vars.clients[client.id]
                    );
                }
            });
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [deleteUserToAllNpcs description]
     * @param  {[type]} idUser [description]
     * @return {[type]}        [description]
     */
    game.deleteUserToAllNpcs = function(idUser) {
        try {
            game.loopArea(vars.clients[idUser], function(target) {
                if (target.isNpc && target.movement == 3) {
                    var index = vars.areaNpc[target.id].indexOf(idUser);

                    if (index > -1) {
                        vars.areaNpc[target.id].splice(index, 1);
                    }
                }
            });
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [isRazaEnana description]
     * @param  {[type]}  idRaza [description]
     * @return {Boolean}        [description]
     */
    game.isRazaEnana = function(idRaza) {
        try {
            if (idRaza == vars.razas.gnomo || idRaza == vars.razas.enano) {
                return true;
            } else {
                return false;
            }
        } catch (err) {
            funct.dumpError(err);
        }
    };
};
