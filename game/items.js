var vars = require("../vars");
var funct = require("../functions");
var handleProtocol = require("../handleProtocol");

function sorter(a, b) {
    try {
        return a - b;
    } catch (err) {
        funct.dumpError(err);
    }
}

module.exports = function addItemsMethods(game) {
    /**
     * [useItem Acción de usar items]
     * @param  {object} ws    [description]
     * @param  {number} idPos [description]
     * @return {}       [description]
     */
    game.useItem = async (ws, idPos) => {
        try {
            var user = vars.personajes[ws.id];

            if (user.useObj.usos >= 20) {
                var tmpDate = +Date.now();

                var msUseObj = tmpDate - user.useObj.startTimer;

                if (msUseObj < 3800) {
                    console.log(
                        "[ALERT|USAR | " +
                            funct.dateFormat(new Date(), "%d-%m-%Y %H:%M:%S") +
                            "] Usuario: " +
                            user.nameCharacter +
                            " - intervalo: " +
                            msUseObj
                    );
                }

                user.useObj.usos = 0;
                user.useObj.startTimer = +Date.now();
            }

            user.useObj.usos++;

            if (+Date.now() - user.hitUseItem < 190) {
                return;
            }

            user.hitUseItem = +Date.now();

            if (user.meditar) {
                handleProtocol.console(
                    "Debes dejar de meditar para realizar esta acción.",
                    "white",
                    0,
                    0,
                    ws
                );
                return;
            }

            var item = user.inv[idPos];

            if (!item) {
                return;
            }

            var idItem = item.idItem;

            var obj = vars.datObj[idItem];

            var maxAttr = 0;

            switch (obj.objType) {
                case vars.objType.pociones: //Pociones
                    if (user.dead) {
                        handleProtocol.console(
                            "Los muertos no pueden usar items.",
                            "white",
                            0,
                            0,
                            ws
                        );
                        return;
                    }

                    if (obj.tipoPocion == vars.typePociones.vida) {
                        //Vida
                        if (user.hp < user.maxHp) {
                            user.hp += funct.randomIntFromInterval(
                                obj.minModificador,
                                obj.maxModificador
                            );

                            if (user.hp > user.maxHp) {
                                user.hp = user.maxHp;
                            }

                            handleProtocol.updateHP(user.hp, ws);
                        }
                        game.quitarUserInvItem(ws.id, idPos, 1);
                    } else if (obj.tipoPocion == vars.typePociones.mana) {
                        //Mana
                        if (user.mana < user.maxMana) {
                            user.mana += parseInt(
                                user.maxMana * 0.04 +
                                    user.level / 2 +
                                    40 / user.level
                            );

                            if (user.mana > user.maxMana) {
                                user.mana = user.maxMana;
                            }

                            handleProtocol.updateMana(user.mana, ws);
                        }
                        game.quitarUserInvItem(ws.id, idPos, 1);
                    } else if (obj.tipoPocion == vars.typePociones.agilidad) {
                        //Agilidad
                        maxAttr = user.bkAttrAgilidad + 19;

                        if (user.attrAgilidad < maxAttr) {
                            user.attrAgilidad += funct.randomIntFromInterval(
                                obj.minModificador,
                                obj.maxModificador
                            );

                            if (user.attrAgilidad > maxAttr) {
                                user.attrAgilidad = maxAttr;
                            }

                            handleProtocol.updateAgilidad(
                                user.attrAgilidad,
                                ws
                            );
                        }

                        user.cooldownAgilidad = +Date.now();
                        game.quitarUserInvItem(ws.id, idPos, 1);
                    } else if (obj.tipoPocion == vars.typePociones.fuerza) {
                        //Fuerza
                        maxAttr = user.bkAttrFuerza + 19;

                        if (user.attrFuerza < maxAttr) {
                            user.attrFuerza += funct.randomIntFromInterval(
                                obj.minModificador,
                                obj.maxModificador
                            );

                            if (user.attrFuerza > maxAttr) {
                                user.attrFuerza = maxAttr;
                            }

                            handleProtocol.updateFuerza(user.attrFuerza, ws);
                        }

                        user.cooldownFuerza = +Date.now();
                        game.quitarUserInvItem(ws.id, idPos, 1);
                    }

                    game.loopArea(ws, function(client) {
                        if (!client.isNpc) {
                            handleProtocol.playSound(
                                user.id,
                                vars.arSounds.SND_BEBER,
                                vars.clients[client.id]
                            );
                        }
                    });
                    break;
                case vars.objType.pergaminos:
                    if (user.dead) {
                        handleProtocol.console(
                            "Los muertos no pueden usar items.",
                            "white",
                            0,
                            0,
                            ws
                        );
                        return;
                    }

                    if (!user.maxMana) {
                        handleProtocol.console(
                            "Tu clase no puede aprender este hechizo.",
                            "white",
                            0,
                            0,
                            ws
                        );
                        return;
                    }

                    var spellAprendido = false;
                    var arIdPos = [];
                    var idPosFinal = 1;

                    for (var spellIndex in user.spells) {
                        var spell = user.spells[spellIndex];
                        if (spell.idSpell == obj.spellIndex) {
                            spellAprendido = true;
                        }

                        arIdPos.push(spellIndex);
                    }

                    if (spellAprendido) {
                        handleProtocol.console(
                            "Este hechizo ya lo has aprendido.",
                            "white",
                            0,
                            0,
                            ws
                        );
                    } else {
                        arIdPos.sort(sorter);

                        while (arIdPos[idPosFinal - 1] == idPosFinal) {
                            idPosFinal++;
                        }

                        user.spells[idPosFinal] = {
                            idSpell: obj.spellIndex
                        };

                        let tmpSpells = [];
                        Object.keys(user.spells).map(idPos => {
                            tmpSpells.push({
                                idPos: idPos,
                                idSpell: user.spells[idPos].idSpell
                            });
                        });

                        const bodyPersonaje = {
                            spells: tmpSpells,
                            updatedAt: new Date()
                        };

                        const characterSave = await funct.fetchUrl(
                            `/character_save/${user._id}`,
                            {
                                method: "PUT",
                                body: JSON.stringify(bodyPersonaje),
                                headers: {
                                    "Content-Type": "application/json",
                                    Authorization: vars.tokenAuth
                                }
                            }
                        );

                        handleProtocol.aprenderSpell(ws.id, idPosFinal);
                        game.quitarUserInvItem(ws.id, idPos, 1);
                    }

                    break;
                case vars.objType.barcos:
                    game.navegar(ws.id);
                    break;
            }
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [hayObjAndBlock Devuelve si hay un objeto y está bloqueado en determinada posición]
     * @param  {number} idMap [description]
     * @param  {number} pos   [description]
     * @return {Boolean}       [description]
     */
    game.hayObjAndBlock = function(idMap, pos) {
        try {
            if (game.hayObj(idMap, pos)) {
                return true;
            } else {
                if (game.isBlocked(idMap, pos)) {
                    return true;
                } else {
                    return false;
                }
            }
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [agarrarItem Acción de agarrar item]
     * @param  {object} ws [description]
     * @return {}    [description]
     */
    game.agarrarItem = function(ws) {
        try {
            var user = vars.personajes[ws.id];

            if (!user) {
                return;
            }

            if (user.dead) {
                handleProtocol.console(
                    "Los muertos no pueden agarrar items.",
                    "white",
                    0,
                    0,
                    ws
                );
                return;
            }

            var idPosFinal = 1;
            var arIdPos = [];
            var agarreItem = false;

            if (game.hayObj(user.map, user.pos)) {
                var item = game.objMap(user.map, user.pos);
                var datObj = vars.datObj[item.objIndex];

                if (datObj.agarrable) {
                    return;
                }

                if (datObj.objType == vars.objType.dinero) {
                    user.gold += item.amount;

                    handleProtocol.actGold(user.gold, ws);
                } else {
                    for (var idPos in user.inv) {
                        if (
                            user.inv[idPos] &&
                            user.inv[idPos].idItem == item.objIndex &&
                            user.inv[idPos].cant + item.amount <= 10000
                        ) {
                            user.inv[idPos].cant += item.amount;
                            agarreItem = true;
                            idPosFinal = idPos;
                            break;
                        }

                        arIdPos.push(idPos);
                    }

                    if (!agarreItem) {
                        if (Object.keys(user.inv).length >= 21) {
                            handleProtocol.console(
                                "Tienes el inventario lleno.",
                                "white",
                                0,
                                0,
                                ws
                            );
                            return;
                        }

                        arIdPos.sort(sorter);

                        while (arIdPos[idPosFinal - 1] == idPosFinal) {
                            idPosFinal++;
                        }

                        user.inv[idPosFinal] = {
                            idItem: item.objIndex,
                            cant: item.amount,
                            equipped: 0
                        };
                    }

                    handleProtocol.agregarUserInvItem(ws.id, idPosFinal, ws);
                }

                delete vars.mapa[user.map][user.pos.y][user.pos.x].objInfo;

                game.loopAreaPos(user.map, user.pos, function(target) {
                    handleProtocol.deleteItem(
                        user.map,
                        user.pos,
                        vars.clients[target.id]
                    );
                });
            }
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [putItemToInv Acción de meter item en inventario]
     * @param  {number} idUser [description]
     * @param  {number} idItem [description]
     * @param  {number} cant   [description]
     * @return {}        [description]
     */
    game.putItemToInv = function(idUser, idItem, cant) {
        try {
            var user = vars.personajes[idUser];

            var idPosFinal = 1;
            var arIdPos = [];
            var agarreItem = false;

            var datObj = vars.datObj[idItem];

            if (datObj.objType == vars.objType.dinero) {
                user.gold += cant;

                handleProtocol.actGold(user.gold, vars.clients[idUser]);
            } else {
                for (var idPos in user.inv) {
                    if (
                        user.inv[idPos] &&
                        user.inv[idPos].idItem == idItem &&
                        user.inv[idPos].cant + cant <= 10000
                    ) {
                        user.inv[idPos].cant += cant;
                        agarreItem = true;
                        idPosFinal = idPos;
                        break;
                    }

                    arIdPos.push(idPos);
                }

                if (!agarreItem) {
                    if (Object.keys(user.inv).length >= 21) {
                        handleProtocol.console(
                            "Tienes el inventario lleno.",
                            "white",
                            0,
                            0,
                            vars.clients[idUser]
                        );
                        return;
                    }

                    arIdPos.sort(sorter);

                    while (arIdPos[idPosFinal - 1] == idPosFinal) {
                        idPosFinal++;
                    }

                    user.inv[idPosFinal] = {
                        idItem: idItem,
                        cant: cant,
                        equipped: 0
                    };
                }

                handleProtocol.agregarUserInvItem(
                    idUser,
                    idPosFinal,
                    vars.clients[idUser]
                );
            }
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [tirarItem Acción de tirar item]
     * @param  {object} ws    [description]
     * @param  {number} idPos [description]
     * @param  {number} cant  [description]
     * @return {}       [description]
     */
    game.tirarItem = function(ws, idPos, cant) {
        try {
            var user = vars.personajes[ws.id];

            var item = user.inv[idPos];

            if (cant < 1) {
                return;
            }

            if (!item) {
                return;
            }

            var idItem = item.idItem;

            if (item.equipped) {
                handleProtocol.console(
                    "Debes desequipar el item para poder tirarlo.",
                    "white",
                    0,
                    0,
                    ws
                );
                return;
            }

            if (vars.datObj[idItem].newbie || user.pvpChar) {
                handleProtocol.console(
                    "No puedes tirar este item.",
                    "white",
                    0,
                    0,
                    ws
                );
                return;
            }

            if (cant > item.cant) {
                cant = item.cant;
            }

            var tmpPos = {
                x: user.pos.x,
                y: user.pos.y
            };

            var count = 0;
            var level = 1;

            while (game.hayObjAndBlock(user.map, tmpPos)) {
                if (count === 0) {
                    tmpPos.x = user.pos.x - level;
                    tmpPos.y = user.pos.y - level;
                } else {
                    tmpPos.x++;
                }

                var filas = 3 * level - (level - 1);

                if (count % filas === 0 && count !== 0) {
                    tmpPos.y++;
                    tmpPos.x = user.pos.x - level;
                }

                count++;

                if (count == filas * filas) {
                    count = 0;
                    level++;
                }

                if (count > 10000) {
                    console.log(
                        "<<<>>> NO HAY LUGAR EN EL PISO MAPA:" + user.map
                    );
                    handleProtocol.console(
                        "No hay lugar en el piso.",
                        "white",
                        0,
                        0,
                        ws
                    );
                    return;
                }
            }

            game.quitarUserInvItem(ws.id, idPos, cant);

            vars.mapa[user.map][tmpPos.y][tmpPos.x].objInfo = {
                objIndex: idItem,
                amount: cant
            };

            game.loopAreaPos(user.map, tmpPos, function(target) {
                handleProtocol.renderItem(
                    idItem,
                    user.map,
                    tmpPos,
                    vars.clients[target.id]
                );
            });
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [quitarUserInvItem description]
     * @param  {[type]} idUser [description]
     * @param  {[type]} idPos  [description]
     * @param  {[type]} cant   [description]
     * @return {[type]}        [description]
     */
    game.quitarUserInvItem = function(idUser, idPos, cant) {
        try {
            var user = vars.personajes[idUser];
            var item = user.inv[idPos];

            if (user.pvpChar) return;

            item.cant -= cant;

            handleProtocol.quitarUserInvItem(
                idUser,
                idPos,
                cant,
                vars.clients[idUser]
            );

            if (item.cant <= 0) {
                if (user.idItemArrow == idPos) {
                    user.idItemArrow = 0;
                }

                delete user.inv[idPos];
            }
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [hayObj description]
     * @param  {[type]} idMap [description]
     * @param  {[type]} pos   [description]
     * @return {[type]}       [description]
     */
    game.hayObj = function(idMap, pos) {
        try {
            if (
                vars.mapa[idMap][pos.y][pos.x] &&
                vars.mapa[idMap][pos.y][pos.x].objInfo &&
                vars.mapa[idMap][pos.y][pos.x].objInfo.objIndex > 0 &&
                vars.mapa[idMap][pos.y][pos.x].objInfo.amount > 0
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
     * [objMap description]
     * @param  {[type]} idMap [description]
     * @param  {[type]} pos   [description]
     * @return {[type]}       [description]
     */
    game.objMap = function(idMap, pos) {
        try {
            return vars.mapa[idMap][pos.y][pos.x].objInfo;
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [tirarItemsUser description]
     * @param  {[type]} idUser [description]
     * @return {[type]}        [description]
     */
    game.tirarItemsUser = function(idUser) {
        try {
            var user = vars.personajes[idUser];

            var ws = vars.clients[idUser];

            for (var idPos in user.inv) {
                var item = user.inv[idPos];
                var idItem = item.idItem;
                var datObj = vars.datObj[idItem];

                if (!datObj.newbie && !datObj.noSeCae) {
                    game.tirarItem(ws, idPos, item.cant);
                }
            }
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [openDoor description]
     * @param  {[type]} idUser [description]
     * @param  {[type]} pos    [description]
     * @param  {[type]} objMap [description]
     * @param  {[type]} obj    [description]
     * @return {[type]}        [description]
     */
    game.openDoor = function(idUser, pos, objMap, obj) {
        try {
            var user = vars.personajes[idUser];

            if (
                Math.abs(user.pos.x - pos.x) > 2 ||
                Math.abs(user.pos.y - pos.y) > 2
            ) {
                handleProtocol.console(
                    "Te encuentras muy lejos para abrir la puerta.",
                    "white",
                    1,
                    0,
                    vars.clients[idUser]
                );
                return;
            }

            if (obj.llave) {
                handleProtocol.console(
                    "La puerta está cerrada con llave.",
                    "white",
                    1,
                    0,
                    vars.clients[idUser]
                );
                return;
            }

            if (objMap.objIndex == obj.indexCerrada) {
                vars.mapa[user.map][pos.y][pos.x].objInfo.objIndex =
                    obj.indexAbierta;

                game.blockMap(user.map, pos, 0);
                game.blockMap(
                    user.map,
                    {
                        x: pos.x - 1,
                        y: pos.y
                    },
                    0
                );
            } else {
                vars.mapa[user.map][pos.y][pos.x].objInfo.objIndex =
                    obj.indexCerrada;

                game.blockMap(user.map, pos, 1);
                game.blockMap(
                    user.map,
                    {
                        x: pos.x - 1,
                        y: pos.y
                    },
                    1
                );
            }

            game.changeObjIndex(
                user.map,
                pos,
                vars.mapa[user.map][pos.y][pos.x].objInfo.objIndex
            );
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [buyItem description]
     * @param  {[type]} idUser [description]
     * @param  {[type]} idPos  [description]
     * @param  {[type]} cant   [description]
     * @return {[type]}        [description]
     */
    game.buyItem = function(idUser, idPos, cant) {
        try {
            var user = vars.personajes[idUser];

            if (cant < 1) {
                return;
            }

            if (user.dead) {
                handleProtocol.console(
                    "Los muertos no pueden comprar items.",
                    "white",
                    0,
                    0,
                    vars.clients[idUser]
                );
                return;
            }

            if (Object.keys(user.inv).length >= 21) {
                handleProtocol.console(
                    "Tienes el inventario lleno.",
                    "white",
                    0,
                    0,
                    vars.clients[idUser]
                );
                return;
            }

            if (user.npcTrade) {
                var npc = vars.npcs[user.npcTrade];

                if (
                    Math.abs(user.pos.x - npc.pos.x) > 2 ||
                    Math.abs(user.pos.y - npc.pos.y) > 2
                ) {
                    handleProtocol.console(
                        "Te encuentras muy lejos para comerciar.",
                        "white",
                        1,
                        0,
                        vars.clients[idUser]
                    );
                    return;
                }

                var itemNpc = npc.objs[idPos];
                var objItem = vars.datObj[itemNpc.item];

                if (parseInt((objItem.valor * cant) / 2) > user.gold) {
                    handleProtocol.console(
                        "No tienes oro suficiente.",
                        "white",
                        1,
                        0,
                        vars.clients[idUser]
                    );
                    return;
                }
                //Comercio 100 en skils es dividido 2

                user.gold -= parseInt((objItem.valor * cant) / 2);

                game.putItemToInv(idUser, itemNpc.item, cant);

                handleProtocol.actGold(user.gold, vars.clients[idUser]);
            }
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [sellItem description]
     * @param  {[type]} idUser [description]
     * @param  {[type]} idPos  [description]
     * @param  {[type]} cant   [description]
     * @return {[type]}        [description]
     */
    game.sellItem = function(idUser, idPos, cant) {
        try {
            var user = vars.personajes[idUser];

            if (cant < 1) {
                return;
            }

            if (user.dead) {
                handleProtocol.console(
                    "Los muertos no pueden vender items.",
                    "white",
                    0,
                    0,
                    vars.clients[idUser]
                );
                return;
            }

            if (user.npcTrade) {
                var npc = vars.npcs[user.npcTrade];

                if (
                    Math.abs(user.pos.x - npc.pos.x) > 2 ||
                    Math.abs(user.pos.y - npc.pos.y) > 2
                ) {
                    handleProtocol.console(
                        "Te encuentras muy lejos para comerciar.",
                        "white",
                        1,
                        0,
                        vars.clients[idUser]
                    );
                    return;
                }

                var itemUser = user.inv[idPos];

                if (!itemUser) {
                    return;
                }

                if (itemUser.equipped) {
                    handleProtocol.console(
                        "Debes desequipar el item para poder venderlo.",
                        "white",
                        0,
                        0,
                        vars.clients[idUser]
                    );
                    return;
                }

                var cantSell = cant;

                if (cantSell > itemUser.cant) {
                    cantSell = itemUser.cant;
                }

                var objItem = vars.datObj[itemUser.idItem];

                /*if (objItem.newbie) {
                    handleProtocol.console('No se puede vender este item.', 'white', 1, 0, vars.clients[idUser]);
                    return;
                }*/

                user.gold += parseInt((objItem.valor * cantSell) / 3);

                game.quitarUserInvItem(idUser, idPos, cantSell);

                handleProtocol.actGold(user.gold, vars.clients[idUser]);
            }
        } catch (err) {
            funct.dumpError(err);
        }
    };
};
