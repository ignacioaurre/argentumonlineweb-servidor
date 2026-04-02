var vars = require("../vars");
var funct = require("../functions");
var handleProtocol = require("../handleProtocol");

module.exports = function addSpellsMethods(game) {
    /**
     * [userSpellNpc description]
     * @param  {[type]} idUser  [description]
     * @param  {[type]} idNpc   [description]
     * @param  {[type]} idSpell [description]
     * @return {[type]}         [description]
     */
    game.userSpellNpc = function(idUser, idNpc, idSpell) {
        try {
            var user = vars.personajes[idUser];
            var npc = vars.npcs[idNpc];

            var datSpell = vars.datSpell[idSpell];

            var dmg = 0;

            if (datSpell.paraliza) {
                if (npc.npcType == 6) {
                    handleProtocol.console(
                        "Este hechizo no funciona sobre esta criatura.",
                        "white",
                        1,
                        0,
                        vars.clients[idUser]
                    );
                    return;
                } else {
                    npc.paralizado = 1;
                    npc.cooldownParalizado = +Date.now();

                    dmg = "Paraliza";
                }
            } else if (datSpell.inmoviliza) {
                if (npc.npcType == 6) {
                    handleProtocol.console(
                        "Este hechizo no funciona sobre esta criatura.",
                        "white",
                        1,
                        0,
                        vars.clients[idUser]
                    );
                    return;
                } else {
                    npc.inmovilizado = 1;
                    npc.cooldownParalizado = +Date.now();

                    dmg = "Inmoviliza";
                }
            } else {
                if (datSpell.subeHp === 1) {
                    //Cura HP
                    curo = funct.randomIntFromInterval(
                        datSpell.minHp,
                        datSpell.maxHp
                    );

                    curo += Math.round((curo * (3 * user.level)) / 100);

                    if (curo < 1) {
                        curo = 1;
                    }

                    if (npc.hp + curo > npc.maxHp) {
                        curo = npc.maxHp - npc.hp;
                    }

                    npc.hp += curo;

                    dmg = -curo;
                } else if (datSpell.subeHp == 2) {
                    //Resta HP
                    dmg = funct.randomIntFromInterval(
                        datSpell.minHp,
                        datSpell.maxHp
                    );

                    dmg += Math.round((dmg * (3 * user.level)) / 100);

                    if (
                        datSpell.staffAffected &&
                        user.idClase == vars.clases.mago &&
                        user.idItemWeapon
                    ) {
                        var itemInventary = user.inv[user.idItemWeapon];

                        if (itemInventary) {
                            var idItem = itemInventary.idItem;
                            var itemWeapon = vars.datObj[idItem];

                            if (itemWeapon.staffDamageBonus > 0) {
                                dmg = parseInt(
                                    (dmg * (70 + itemWeapon.staffDamageBonus)) /
                                        100
                                );
                            }
                        }
                    }

                    if (dmg < 1) {
                        dmg = 1;
                    }

                    npc.hp -= dmg;
                }
            }

            handleProtocol.console(
                "Has lanzado " + datSpell.name + " sobre " + npc.nameCharacter,
                "red",
                1,
                0,
                vars.clients[idUser]
            );

            if (dmg > 0) {
                handleProtocol.console(
                    "Le has quitado " +
                        dmg +
                        " puntos de vida a " +
                        npc.nameCharacter,
                    "red",
                    1,
                    0,
                    vars.clients[idUser]
                );
                game.calcularExp(idUser, idNpc, dmg);
            } else if (dmg < 0) {
                handleProtocol.console(
                    "Le has curado " +
                        Math.abs(dmg) +
                        " puntos de vida a " +
                        npc.nameCharacter,
                    "red",
                    1,
                    0,
                    vars.clients[idUser]
                );
            }

            return dmg;
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [userSpellUser description]
     * @param  {[type]} idUser         [description]
     * @param  {[type]} idUserAttacked [description]
     * @param  {[type]} idSpell        [description]
     * @return {[type]}                [description]
     */
    game.userSpellUser = function(idUser, idUserAttacked, idSpell) {
        try {
            var user = vars.personajes[idUser];
            var userAttacked = vars.personajes[idUserAttacked];

            game.cancelLogout(
                idUserAttacked,
                "El cierre de sesión fue cancelado porque has sido atacado."
            );

            if (
                vars.mapData[user.map].pk &&
                !user.isNpc &&
                idUser != idUserAttacked &&
                (vars.mapa[user.map][user.pos.y][user.pos.x].trigger != 6 ||
                    vars.mapa[userAttacked.map][userAttacked.pos.y][
                        userAttacked.pos.x
                    ].trigger != 6)
            ) {
                handleProtocol.console(
                    "No puedes atacar a otro usuario estando en una zona segura.",
                    "white",
                    0,
                    0,
                    vars.clients[idUser]
                );
                return 0;
            }

            var datSpell = vars.datSpell[idSpell];

            var dmg = 0;

            if (datSpell.paraliza) {
                if (idUser == idUserAttacked) {
                    handleProtocol.console(
                        "¡No puedes atacarte a ti mismo!",
                        "white",
                        1,
                        0,
                        vars.clients[idUser]
                    );
                    return 0;
                }

                if (!user.criminal && !userAttacked.criminal) {
                    if (user.seguroActivado) {
                        handleProtocol.console(
                            "Debes desactivar el seguro para poder atacar a ciudadanos (S). ¡Te convertiras en un criminal!",
                            "white",
                            1,
                            0,
                            vars.clients[idUser]
                        );

                        return 0;
                    }

                    game.hacerCriminal(idUser);
                }

                userAttacked.paralizado = 1;
                userAttacked.cooldownParalizado = +Date.now();

                handleProtocol.inmo(
                    idUserAttacked,
                    1,
                    vars.clients[idUserAttacked]
                );

                dmg = "Paraliza";
            } else if (datSpell.inmoviliza) {
                if (idUser == idUserAttacked) {
                    handleProtocol.console(
                        "¡No puedes atacarte a ti mismo!",
                        "white",
                        1,
                        0,
                        vars.clients[idUser]
                    );
                    return 0;
                }

                if (!user.criminal && !userAttacked.criminal) {
                    if (user.seguroActivado) {
                        handleProtocol.console(
                            "Debes desactivar el seguro para poder atacar a ciudadanos (S). ¡Te convertiras en un criminal!",
                            "white",
                            1,
                            0,
                            vars.clients[idUser]
                        );

                        return 0;
                    }

                    game.hacerCriminal(idUser);
                }

                userAttacked.inmovilizado = 1;
                userAttacked.cooldownParalizado = +Date.now();

                handleProtocol.inmo(
                    idUserAttacked,
                    1,
                    vars.clients[idUserAttacked]
                );

                dmg = "Inmoviliza";
            } else if (datSpell.removerParalisis) {
                userAttacked.inmovilizado = 0;
                userAttacked.paralizado = 0;
                userAttacked.cooldownParalizado = 0;

                handleProtocol.inmo(
                    idUserAttacked,
                    0,
                    vars.clients[idUserAttacked]
                );

                dmg = "Remueve";
            } else {
                var maxAttr = 0;

                if (datSpell.subeHp === 1) {
                    //Cura HP
                    curo = funct.randomIntFromInterval(
                        datSpell.minHp,
                        datSpell.maxHp
                    );

                    curo += Math.round((curo * (3 * user.level)) / 100);

                    if (curo < 1) {
                        curo = 1;
                    }

                    if (userAttacked.hp + curo > userAttacked.maxHp) {
                        curo = userAttacked.maxHp - userAttacked.hp;
                    }

                    userAttacked.hp += curo;

                    dmg = -curo;
                } else if (datSpell.subeHp == 2) {
                    //Resta HP
                    if (idUser == idUserAttacked) {
                        handleProtocol.console(
                            "¡No puedes atacarte a ti mismo!",
                            "white",
                            1,
                            0,
                            vars.clients[idUser]
                        );
                        return 0;
                    }

                    if (
                        !user.criminal &&
                        !userAttacked.criminal &&
                        (vars.mapa[user.map][user.pos.y][user.pos.x].trigger !=
                            6 ||
                            vars.mapa[userAttacked.map][userAttacked.pos.y][
                                userAttacked.pos.x
                            ].trigger != 6)
                    ) {
                        if (user.seguroActivado) {
                            handleProtocol.console(
                                "Debes desactivar el seguro para poder atacar a ciudadanos (S). ¡Te convertiras en un criminal!",
                                "white",
                                1,
                                0,
                                vars.clients[idUser]
                            );

                            return 0;
                        }

                        game.hacerCriminal(idUser);
                    }

                    dmg = funct.randomIntFromInterval(
                        datSpell.minHp,
                        datSpell.maxHp
                    );

                    dmg += Math.round((dmg * (3 * user.level)) / 100);

                    if (
                        datSpell.staffAffected &&
                        user.idClase == vars.clases.mago &&
                        user.idItemWeapon
                    ) {
                        var itemInventary = user.inv[user.idItemWeapon];

                        if (itemInventary) {
                            var idItem = itemInventary.idItem;
                            var itemWeapon = vars.datObj[idItem];

                            if (itemWeapon.staffDamageBonus > 0) {
                                dmg = parseInt(
                                    (dmg * (70 + itemWeapon.staffDamageBonus)) /
                                        100
                                );
                            }
                        }
                    }

                    if (userAttacked.idItemHelmet) {
                        var itemInventaryHelmet =
                            userAttacked.inv[userAttacked.idItemHelmet];
                        if (itemInventaryHelmet) {
                            var idItemHelmet = itemInventaryHelmet.idItem;
                            var itemHelmet = vars.datObj[idItemHelmet];

                            if (itemHelmet.minDefMag && itemHelmet.maxDefMag) {
                                dmg -= funct.randomIntFromInterval(
                                    itemHelmet.minDefMag,
                                    itemHelmet.maxDefMag
                                );
                            }
                        }
                    }

                    if (dmg < 1) {
                        dmg = 1;
                    }

                    userAttacked.hp -= dmg;
                } else if (datSpell.subeAg === 1) {
                    maxAttr = user.bkAttrAgilidad + 19;

                    if (user.attrAgilidad < maxAttr) {
                        user.attrAgilidad += funct.randomIntFromInterval(
                            datSpell.minAg,
                            datSpell.maxAg
                        );

                        if (user.attrAgilidad > maxAttr) {
                            user.attrAgilidad = maxAttr;
                        }

                        handleProtocol.updateAgilidad(
                            user.attrAgilidad,
                            vars.clients[idUserAttacked]
                        );
                    }

                    user.cooldownAgilidad = +Date.now();

                    dmg = "Agilidad";
                } else if (datSpell.subeFz === 1) {
                    maxAttr = user.bkAttrFuerza + 19;

                    if (user.attrFuerza < maxAttr) {
                        user.attrFuerza += funct.randomIntFromInterval(
                            datSpell.minFz,
                            datSpell.maxFz
                        );

                        if (user.attrFuerza > maxAttr) {
                            user.attrFuerza = maxAttr;
                        }

                        handleProtocol.updateFuerza(
                            user.attrFuerza,
                            vars.clients[idUserAttacked]
                        );
                    }

                    user.cooldownFuerza = +Date.now();

                    dmg = "Fuerza";
                }
            }

            if (idUser == idUserAttacked) {
                handleProtocol.console(
                    "Has lanzado " + datSpell.name + " sobre ti.",
                    "red",
                    1,
                    0,
                    vars.clients[idUser]
                );
            } else {
                handleProtocol.console(
                    "Has lanzado " +
                        datSpell.name +
                        " sobre " +
                        userAttacked.nameCharacter,
                    "red",
                    1,
                    0,
                    vars.clients[idUser]
                );
                handleProtocol.console(
                    user.nameCharacter +
                        " ha lanzado " +
                        datSpell.name +
                        " sobre ti",
                    "red",
                    1,
                    0,
                    vars.clients[idUserAttacked]
                );
            }

            if (dmg > 0) {
                handleProtocol.console(
                    "Le has quitado " +
                        dmg +
                        " puntos de vida a " +
                        userAttacked.nameCharacter,
                    "red",
                    1,
                    0,
                    vars.clients[idUser]
                );
                handleProtocol.console(
                    user.nameCharacter +
                        " te ha quitado " +
                        dmg +
                        " puntos de vida",
                    "red",
                    1,
                    0,
                    vars.clients[idUserAttacked]
                );
            } else if (dmg < 0) {
                handleProtocol.console(
                    "Le has curado " +
                        Math.abs(dmg) +
                        " puntos de vida a " +
                        userAttacked.nameCharacter,
                    "red",
                    1,
                    0,
                    vars.clients[idUser]
                );
                handleProtocol.console(
                    user.nameCharacter +
                        " te ha curado " +
                        Math.abs(dmg) +
                        " puntos de vida",
                    "red",
                    1,
                    0,
                    vars.clients[idUserAttacked]
                );
            }

            return dmg;
        } catch (err) {
            funct.dumpError(err);
        }
    };
};
