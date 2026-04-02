var vars = require("../vars");
var funct = require("../functions");
var handleProtocol = require("../handleProtocol");
var socket = require("../socket");

module.exports = function addMovementMethods(game) {
    /**
     * [legalPos Permite saber si hay bloqueos o agua en determinada posición]
     * @param  {number} x          [description]
     * @param  {number} y          [description]
     * @param  {number} idMapa     [description]
     * @param  {boolean} aguaValida [description]
     * @return {Boolean}            [description]
     */
    game.legalPos = function(x, y, idMapa, aguaValida) {
        try {
            if (x >= 1 && y >= 1 && x <= 100 && y <= 100) {
                var ret = true;

                if (!vars.mapa[idMapa][y][x].blocked) {
                    if (vars.mapData[idMapa][y][x].id) {
                        ret = false;
                    } else {
                        ret = true;
                    }
                } else {
                    ret = false;
                }

                if (
                    game.hayAgua(idMapa, {
                        x: x,
                        y: y
                    })
                ) {
                    if (aguaValida && !vars.mapData[idMapa][y][x].id) {
                        ret = true;
                    } else {
                        ret = false;
                    }
                } else {
                    if (aguaValida) {
                        ret = false;
                    }
                }

                return ret;
            } else {
                return false;
            }
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [hayAgua Permite saber si hay agua en determinada posición]
     * @param  {number} idMap [description]
     * @param  {object} pos   [description]
     * @return {Boolean}       [description]
     */
    game.hayAgua = function(idMap, pos) {
        if (
            (vars.mapa[idMap][pos.y][pos.x].graphics[1] >= 1505 &&
                vars.mapa[idMap][pos.y][pos.x].graphics[1] <= 1520 &&
                !vars.mapa[idMap][pos.y][pos.x].graphics[2]) ||
            (vars.mapa[idMap][pos.y][pos.x].graphics[1] >= 5665 &&
                vars.mapa[idMap][pos.y][pos.x].graphics[1] <= 5680 &&
                !vars.mapa[idMap][pos.y][pos.x].graphics[2]) ||
            (vars.mapa[idMap][pos.y][pos.x].graphics[1] >= 13547 &&
                vars.mapa[idMap][pos.y][pos.x].graphics[1] <= 13562 &&
                !vars.mapa[idMap][pos.y][pos.x].graphics[2])
        ) {
            return true;
        } else {
            return false;
        }
    };

    /**
     * [isBlocked Permite saber si está bloqueada determinada posición]
     * @param  {number}  idMap [description]
     * @param  {object}  pos   [description]
     * @return {Boolean}       [description]
     */
    game.isBlocked = function(idMap, pos) {
        try {
            if (vars.mapa[idMap][pos.y][pos.x].blocked) {
                return true;
            } else {
                return false;
            }
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [legalPosUser Permite saber si es una posición legal para el usuario]
     * @param  {number} x      [description]
     * @param  {number} y      [description]
     * @param  {number} idMapa [description]
     * @return {Boolean}        [description]
     */
    game.legalPosUser = function(x, y, idMapa) {
        try {
            if (
                x >= 1 &&
                y >= 1 &&
                x <= 100 &&
                y <= 100 &&
                !vars.mapData[idMapa][y][x].id
            ) {
                return true;
            } else {
                return false;
            }
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [isTelep description]
     * @param  {[type]}  posX [description]
     * @param  {[type]}  posY [description]
     * @return {Boolean}      [description]
     */
    game.isTelep = function(posX, posY) {
        try {
            if (posX >= 52 && posX <= 55 && (posY >= 48 && posY <= 51)) {
                return true;
            } else {
                return false;
            }
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [setNewAreas description]
     * @param {[type]} ws [description]
     */
    game.setNewAreas = function(ws) {
        try {
            var user = vars.personajes[ws.id];

            handleProtocol.nameMap(ws.id);

            var posXStart = user.pos.x - 10;
            var posYStart = user.pos.y - 10;

            var posXEnd = user.pos.x + 10;
            var posYEnd = user.pos.y + 10;

            for (var y = posYStart; y <= posYEnd; y++) {
                for (var x = posXStart; x <= posXEnd; x++) {
                    if (x >= 1 && y >= 1 && x <= 100 && y <= 100) {
                        var mapData = vars.mapData[user.map][y][x];

                        if (mapData.id) {
                            var target = vars.npcs[mapData.id];

                            if (!target) {
                                target = vars.personajes[mapData.id];

                                if (mapData.id != ws.id) {
                                    handleProtocol.sendCharacter(user);
                                    socket.send(vars.clients[mapData.id]);

                                    handleProtocol.sendCharacter(target);
                                    socket.send(ws);
                                }
                            } else {
                                if (target.movement == 3 && !user.dead) {
                                    if (
                                        vars.areaNpc[mapData.id].indexOf(
                                            ws.id
                                        ) < 0
                                    ) {
                                        vars.areaNpc[mapData.id].push(ws.id);
                                    }
                                }

                                handleProtocol.sendNpc(target);
                                socket.send(ws);
                            }
                        }

                        var pos = {
                            x: x,
                            y: y
                        };

                        if (game.hayObj(user.map, pos)) {
                            var item = game.objMap(user.map, pos);
                            var obj = vars.datObj[item.objIndex];

                            if (obj.objType == vars.objType.puerta) {
                                if (item.objIndex == obj.indexAbierta) {
                                    handleProtocol.blockMap(
                                        user.map,
                                        pos,
                                        0,
                                        ws
                                    );
                                    handleProtocol.blockMap(
                                        user.map,
                                        {
                                            x: pos.x - 1,
                                            y: pos.y
                                        },
                                        0,
                                        ws
                                    );
                                }
                            }

                            handleProtocol.renderItem(
                                item.objIndex,
                                user.map,
                                pos,
                                ws
                            );
                        }
                    }
                }
            }
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [loopArea description]
     * @param  {[type]}   ws       [description]
     * @param  {Function} callback [description]
     * @return {[type]}            [description]
     */
    game.loopArea = function(ws, callback) {
        try {
            if (!ws) {
                return;
            }

            var user = vars.personajes[ws.id];

            var posXStart = user.pos.x - 10;
            var posYStart = user.pos.y - 10;

            var posXEnd = user.pos.x + 10;
            var posYEnd = user.pos.y + 10;

            for (var y = posYStart; y <= posYEnd; y++) {
                for (var x = posXStart; x <= posXEnd; x++) {
                    if (x >= 1 && y >= 1 && x <= 100 && y <= 100) {
                        var mapData = vars.mapData[user.map][y][x];

                        if (mapData.id) {
                            var target = vars.npcs[mapData.id];

                            if (!target) {
                                target = vars.personajes[mapData.id];
                            }

                            callback(target);
                        }
                    }
                }
            }
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [loopAreaPos description]
     * @param  {[type]}   idMap    [description]
     * @param  {[type]}   pos      [description]
     * @param  {Function} callback [description]
     * @return {[type]}            [description]
     */
    game.loopAreaPos = function(idMap, pos, callback) {
        try {
            var posXStart = pos.x - 10;
            var posYStart = pos.y - 10;

            var posXEnd = pos.x + 10;
            var posYEnd = pos.y + 10;

            for (var y = posYStart; y <= posYEnd; y++) {
                for (var x = posXStart; x <= posXEnd; x++) {
                    if (x >= 1 && x <= 100 && y >= 1 && y <= 100) {
                        var mapData = vars.mapData[idMap][y][x];

                        if (mapData.id) {
                            var target = vars.personajes[mapData.id];

                            if (target) {
                                callback(target);
                            }
                        }
                    }
                }
            }
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [telep description]
     * @param  {[type]} ws     [description]
     * @param  {[type]} numMap [description]
     * @param  {[type]} posX   [description]
     * @param  {[type]} posY   [description]
     * @return {[type]}        [description]
     */
    game.telep = function(ws, numMap, posX, posY) {
        try {
            var user = vars.personajes[ws.id];
            vars.mapData[user.map][user.pos.y][user.pos.x].id = 0;

            game.loopArea(ws, function(target) {
                if (!target.isNpc && target.id != ws.id) {
                    handleProtocol.deleteCharacter(target.id, ws);
                    handleProtocol.deleteCharacter(
                        ws.id,
                        vars.clients[target.id]
                    );
                } else if (target.isNpc && vars.npcs[target.id].movement == 3) {
                    var index = vars.areaNpc[target.id].indexOf(ws.id);

                    if (index > -1) {
                        vars.areaNpc[target.id].splice(index, 1);
                    }
                }

                if (target.isNpc) {
                    handleProtocol.deleteCharacter(target.id, ws);
                }
            });

            var tileExit = vars.mapa[numMap][posY][posX].tileExit;

            if (typeof tileExit !== "undefined") {
                game.deleteUserToAllNpcs(ws.id);
                game.telep(ws, tileExit.map, tileExit.x, tileExit.y);
                return;
            }

            var tmpPos = {
                x: posX,
                y: posY
            };

            var count = 0;
            var level = 1;

            while (
                !game.legalPos(tmpPos.x, tmpPos.y, numMap, false) &&
                !user.navegando &&
                user.privileges !== 1
            ) {
                if (count === 0) {
                    tmpPos.x = posX - level;
                    tmpPos.y = posY - level;
                } else {
                    tmpPos.x++;
                }

                var filas = 3 * level - (level - 1);

                if (count % filas === 0 && count !== 0) {
                    tmpPos.y++;
                    tmpPos.x = posX - level;
                }

                count++;

                if (count == filas * filas) {
                    count = 0;
                    level++;
                }

                if (
                    (tmpPos.x > 100 || tmpPos.x < 0) &&
                    (tmpPos.y > 100 || tmpPos.y < 0)
                ) {
                    tmpPos.x = 50;
                    tmpPos.y = 50;
                    numMap = 1;
                }

                if (count > 20000) {
                    console.log(
                        "CIERRO A USUARIO " +
                            user.nameCharacter +
                            " ESTÁ EXPLOTANDO TODO MAPA " +
                            numMap
                    );

                    tmpPos.x = 50;
                    tmpPos.y = 50;
                    numMap = 1;

                    user.map = parseInt(numMap);
                    user.pos.x = parseInt(tmpPos.x);
                    user.pos.y = parseInt(tmpPos.y);

                    vars.mapData[user.map][user.pos.y][user.pos.x].id = ws.id;

                    game.closeForce(ws.id);

                    return;
                }
            }

            user.map = parseInt(numMap);
            user.pos.x = parseInt(tmpPos.x);
            user.pos.y = parseInt(tmpPos.y);

            vars.mapData[user.map][user.pos.y][user.pos.x].id = ws.id;

            handleProtocol.telepMe(ws.id, user.map, user.pos, ws);

            game.setNewAreas(ws);
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [getFreeSpace description]
     * @param  {[type]} ws     [description]
     * @param  {[type]} numMap [description]
     * @param  {[type]} posX   [description]
     * @param  {[type]} posY   [description]
     * @return {[type]}        [description]
     */
    game.getFreeSpace = function(ws, numMap, posX, posY) {
        try {
            const user = vars.personajes[ws.id];

            var tmpPos = {
                x: posX,
                y: posY
            };

            var count = 0;
            var level = 1;

            while (
                !game.legalPos(tmpPos.x, tmpPos.y, numMap, false) &&
                !user.navegando
            ) {
                if (count === 0) {
                    tmpPos.x = posX - level;
                    tmpPos.y = posY - level;
                } else {
                    tmpPos.x++;
                }

                var filas = 3 * level - (level - 1);

                if (count % filas === 0 && count !== 0) {
                    tmpPos.y++;
                    tmpPos.x = posX - level;
                }

                count++;

                if (count == filas * filas) {
                    count = 0;
                    level++;
                }

                if (
                    (tmpPos.x > 100 || tmpPos.x < 0) &&
                    (tmpPos.y > 100 || tmpPos.y < 0)
                ) {
                    tmpPos.x = 50;
                    tmpPos.y = 50;
                    numMap = 1;
                }

                if (count > 20000) {
                    console.log(
                        "CIERRO A USUARIO " +
                            user.nameCharacter +
                            " ESTÁ EXPLOTANDO TODO MAPA " +
                            numMap
                    );

                    tmpPos.x = 50;
                    tmpPos.y = 50;
                    numMap = 1;

                    game.closeForce(ws.id);

                    return;
                }
            }

            return tmpPos;
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [puedePegar description]
     * @param  {[type]} posX [description]
     * @param  {[type]} posY [description]
     * @return {[type]}      [description]
     */
    game.puedePegar = function(posX, posY) {
        try {
            return true;
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [navegar description]
     * @param  {[type]} idUser [description]
     * @return {[type]}        [description]
     */
    game.navegar = function(idUser) {
        try {
            var user = vars.personajes[idUser];

            if (user.navegando) {
                if (
                    game.legalPos(
                        user.pos.x - 1,
                        user.pos.y,
                        user.map,
                        false
                    ) ||
                    game.legalPos(
                        user.pos.x,
                        user.pos.y - 1,
                        user.map,
                        false
                    ) ||
                    game.legalPos(
                        user.pos.x + 1,
                        user.pos.y,
                        user.map,
                        false
                    ) ||
                    game.legalPos(user.pos.x, user.pos.y + 1, user.map, false)
                ) {
                    if (user.dead) {
                        user.idBody = 8;
                        user.idHead = 500;
                    } else {
                        user.idBody = user.idLastBody;
                        user.idHead = user.idLastHead;
                    }
                    user.idWeapon = user.idLastWeapon;
                    user.idHelmet = user.idLastHelmet;
                    user.idShield = user.idLastShield;

                    user.navegando = 0;

                    handleProtocol.navegando(idUser, vars.clients[idUser]);

                    game.loopArea(vars.clients[idUser], function(client) {
                        if (!client.isNpc) {
                            handleProtocol.changeBody(
                                idUser,
                                vars.clients[client.id]
                            );
                        }
                    });
                } else {
                    handleProtocol.console(
                        "¡Debes aproximarte a la costa para poder bajar del barco!",
                        "white",
                        0,
                        0,
                        vars.clients[idUser]
                    );
                    return;
                }
            } else {
                if (
                    game.legalPos(user.pos.x - 1, user.pos.y, user.map, true) ||
                    game.legalPos(user.pos.x, user.pos.y - 1, user.map, true) ||
                    game.legalPos(user.pos.x + 1, user.pos.y, user.map, true) ||
                    game.legalPos(user.pos.x, user.pos.y + 1, user.map, true)
                ) {
                    if (user.idHead != 500) {
                        user.idLastHead = JSON.parse(user.idHead);
                    }
                    if (user.idBody != 8) {
                        user.idLastBody = JSON.parse(user.idBody);
                    }
                    user.idLastHelmet = JSON.parse(user.idHelmet);
                    user.idLastWeapon = JSON.parse(user.idWeapon);
                    user.idLastShield = JSON.parse(user.idShield);

                    if (user.dead) {
                        user.idBody = 87;
                    } else {
                        user.idBody = 84;
                    }

                    user.idHead = 0;
                    user.idWeapon = 0;
                    user.idHelmet = 0;
                    user.idShield = 0;

                    user.navegando = 1;

                    handleProtocol.navegando(idUser, vars.clients[idUser]);

                    game.loopArea(vars.clients[idUser], function(client) {
                        if (!client.isNpc) {
                            handleProtocol.changeBody(
                                idUser,
                                vars.clients[client.id]
                            );
                        }
                    });
                } else {
                    handleProtocol.console(
                        "¡Debes aproximarte al agua para usar el barco!",
                        "white",
                        0,
                        0,
                        vars.clients[idUser]
                    );
                    return;
                }
            }
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [blockMap description]
     * @param  {[type]} idMap [description]
     * @param  {[type]} pos   [description]
     * @param  {[type]} block [description]
     * @return {[type]}       [description]
     */
    game.blockMap = function(idMap, pos, block) {
        try {
            vars.mapa[idMap][pos.y][pos.x].blocked = block;

            game.loopAreaPos(idMap, pos, function(target) {
                handleProtocol.blockMap(
                    idMap,
                    pos,
                    block,
                    vars.clients[target.id]
                );
            });
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [changeObjIndex description]
     * @param  {[type]} idMap    [description]
     * @param  {[type]} pos      [description]
     * @param  {[type]} objIndex [description]
     * @return {[type]}          [description]
     */
    game.changeObjIndex = function(idMap, pos, objIndex) {
        try {
            vars.mapa[idMap][pos.y][pos.x].objInfo.objIndex = objIndex;

            game.loopAreaPos(idMap, pos, function(target) {
                handleProtocol.renderItem(
                    objIndex,
                    idMap,
                    pos,
                    vars.clients[target.id]
                );
            });
        } catch (err) {
            funct.dumpError(err);
        }
    };
};
