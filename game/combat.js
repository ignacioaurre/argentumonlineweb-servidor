var vars = require("../vars");
var funct = require("../functions");
var handleProtocol = require("../handleProtocol");

module.exports = function addCombatMethods(game) {
    /**
     * [calcularDmg description]
     * @param  {[type]} idUser [description]
     * @return {[type]}        [description]
     */
    game.calcularDmg = function(idUser) {
        try {
            var user = vars.personajes[idUser];

            var dmgArma = 0;
            var dmgMaxArma = 0;

            if (user.idItemWeapon) {
                var itemInventary = user.inv[user.idItemWeapon];
                var idItem = itemInventary.idItem;
                var itemWeapon = vars.datObj[idItem];

                dmgArma = funct.randomIntFromInterval(
                    itemWeapon.minHit,
                    itemWeapon.maxHit
                );

                if (itemWeapon.proyectil) {
                    var itemInventaryArrow = user.inv[user.idItemArrow];

                    if (!itemInventaryArrow) {
                        return;
                    }

                    var idItemArrow = itemInventaryArrow.idItem;
                    var itemArrow = vars.datObj[idItemArrow];

                    dmgArma += funct.randomIntFromInterval(
                        itemArrow.minHit,
                        itemArrow.maxHit
                    );

                    modClase = vars.modDmgProyectiles[user.idClase];
                } else {
                    modClase = vars.modDmgArmas[user.idClase];
                }

                dmgMaxArma = itemWeapon.maxHit;
            } else {
                dmgArma = funct.randomIntFromInterval(4, 9);
                modClase = vars.modDmgWrestling[user.idClase];

                dmgMaxArma = 9;
            }

            var dmgUser = funct.randomIntFromInterval(user.minHit, user.maxHit);

            var dmg = parseInt(
                (3 * dmgArma +
                    (dmgMaxArma / 5) * Math.max(0, user.attrFuerza - 15) +
                    dmgUser) *
                    modClase
            );

            return dmg;
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [userDmgNpc description]
     * @param  {[type]} idUser [description]
     * @param  {[type]} idNpc  [description]
     * @return {[type]}        [description]
     */
    game.userDmgNpc = function(idUser, idNpc) {
        try {
            var user = vars.personajes[idUser];
            var npc = vars.npcs[idNpc];

            var modClase = 0;

            var poderAtaque = game.poderAtaqueArma(idUser);

            var probExito = Math.max(
                10,
                Math.min(90, 50 + (poderAtaque - npc.poderEvasion) * 0.4)
            );

            var userImpacto = funct.randomIntFromInterval(1, 100) <= probExito;

            if (userImpacto) {
                var dmg = game.calcularDmg(idUser);

                dmg -= npc.def;

                if (dmg < 1) {
                    dmg = 1;
                }

                npc.hp -= dmg;

                handleProtocol.console(
                    "Le has pegado a " + npc.nameCharacter + " por " + dmg,
                    "red",
                    1,
                    0,
                    vars.clients[idUser]
                );

                game.calcularExp(idUser, idNpc, dmg);

                if (npc.hp > 0 && game.puedeApu(idUser)) {
                    game.apuNpc(idUser, idNpc, dmg);
                }

                return dmg;
            } else {
                return "¡Fallas!";
            }
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [userDmgUser description]
     * @param  {[type]} idUser         [description]
     * @param  {[type]} idUserAttacked [description]
     * @return {[type]}                [description]
     */
    game.userDmgUser = function(idUser, idUserAttacked) {
        try {
            var user = vars.personajes[idUser];
            var userAttacked = vars.personajes[idUserAttacked];

            game.cancelLogout(
                idUserAttacked,
                "El cierre de sesión fue cancelado porque has sido atacado."
            );

            if (idUser == idUserAttacked) {
                handleProtocol.console(
                    "¡No puedes atacarte a ti mismo!",
                    "white",
                    0,
                    0,
                    vars.clients[idUser]
                );
                return;
            }

            if (
                vars.mapData[user.map].pk &&
                !userAttacked.isNpc &&
                idUser != idUserAttacked &&
                (vars.mapa[user.map][user.pos.y][user.pos.x].trigger != 6 &&
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
                return;
            }

            var modClase = 0;

            var poderAtaque = game.poderAtaqueArma(idUser);
            var userAttackedEvasion = game.poderEvasion(idUserAttacked),
                userAttackedPoderEvasionEscudo = game.poderEvasionEscudo(
                    idUserAttacked
                );

            if (userAttacked.idItemShield) {
                userAttackedEvasion += userAttackedPoderEvasionEscudo;
            }

            var probExito = Math.max(
                10,
                Math.min(90, 50 + (poderAtaque - userAttackedEvasion) * 0.4)
            );

            var userImpacto = funct.randomIntFromInterval(1, 100) <= probExito;

            var dmg = 0;

            if (
                !user.criminal &&
                !userAttacked.criminal &&
                (vars.mapa[user.map][user.pos.y][user.pos.x].trigger != 6 ||
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

                    return;
                }

                game.hacerCriminal(idUser);
            }

            if (userImpacto) {
                dmg = game.calcularDmg(idUser);

                var lugarCuerpo = funct.randomIntFromInterval(
                        vars.partesCuerpo.cabeza,
                        vars.partesCuerpo.torso
                    ),
                    absorbeDmg = 0;

                switch (lugarCuerpo) {
                    case vars.partesCuerpo.cabeza:
                        if (userAttacked.idItemHelmet) {
                            var itemInventaryHelmet =
                                userAttacked.inv[userAttacked.idItemHelmet];
                            var idItemHelmet = itemInventaryHelmet.idItem;
                            var itemHelmet = vars.datObj[idItemHelmet];

                            absorbeDmg = funct.randomIntFromInterval(
                                itemHelmet.minDef,
                                itemHelmet.maxDef
                            );
                        }

                        break;
                    default:
                        var minDef = 0,
                            maxDef = 0;

                        if (userAttacked.idItemBody) {
                            var itemInventaryBody =
                                userAttacked.inv[userAttacked.idItemBody];
                            var idItemBody = itemInventaryBody.idItem;
                            var itemBody = vars.datObj[idItemBody];

                            minDef = itemBody.minDef;
                            maxDef = itemBody.maxDef;
                        }

                        if (userAttacked.idItemShield) {
                            var itemInventaryShield =
                                userAttacked.inv[userAttacked.idItemShield];
                            var idItemShield = itemInventaryShield.idItem;
                            var itemShield = vars.datObj[idItemShield];

                            minDef += itemShield.minDef;
                            maxDef += itemShield.maxDef;
                        }

                        if (maxDef > 0) {
                            absorbeDmg = funct.randomIntFromInterval(
                                minDef,
                                maxDef
                            );
                        }
                        break;
                }

                dmg -= absorbeDmg;

                if (dmg < 1) {
                    dmg = 1;
                }

                userAttacked.hp -= dmg;

                handleProtocol.updateHP(
                    userAttacked.hp,
                    vars.clients[idUserAttacked]
                );

                switch (lugarCuerpo) {
                    case vars.partesCuerpo.cabeza:
                        handleProtocol.console(
                            user.nameCharacter +
                                " te ha pegado en la cabeza por " +
                                dmg,
                            "red",
                            1,
                            0,
                            vars.clients[idUserAttacked]
                        );
                        handleProtocol.console(
                            "Le has pegado a " +
                                userAttacked.nameCharacter +
                                " en la cabeza por " +
                                dmg,
                            "red",
                            1,
                            0,
                            vars.clients[idUser]
                        );
                        break;
                    case vars.partesCuerpo.piernaIzquierda:
                        handleProtocol.console(
                            user.nameCharacter +
                                " te ha pegado en la pierna izquierda por " +
                                dmg,
                            "red",
                            1,
                            0,
                            vars.clients[idUserAttacked]
                        );
                        handleProtocol.console(
                            "Le has pegado a " +
                                userAttacked.nameCharacter +
                                " en la pierna izquierda por " +
                                dmg,
                            "red",
                            1,
                            0,
                            vars.clients[idUser]
                        );
                        break;
                    case vars.partesCuerpo.piernaDerecha:
                        handleProtocol.console(
                            user.nameCharacter +
                                " te ha pegado en la pierna derecha por " +
                                dmg,
                            "red",
                            1,
                            0,
                            vars.clients[idUserAttacked]
                        );
                        handleProtocol.console(
                            "Le has pegado a " +
                                userAttacked.nameCharacter +
                                " en la pierna derecha por " +
                                dmg,
                            "red",
                            1,
                            0,
                            vars.clients[idUser]
                        );
                        break;
                    case vars.partesCuerpo.brazoDerecho:
                        handleProtocol.console(
                            user.nameCharacter +
                                " te ha pegado en el brazo derecho por " +
                                dmg,
                            "red",
                            1,
                            0,
                            vars.clients[idUserAttacked]
                        );
                        handleProtocol.console(
                            "Le has pegado a " +
                                userAttacked.nameCharacter +
                                " en el brazo derecho por " +
                                dmg,
                            "red",
                            1,
                            0,
                            vars.clients[idUser]
                        );
                        break;
                    case vars.partesCuerpo.brazoIzquierdo:
                        handleProtocol.console(
                            user.nameCharacter +
                                " te ha pegado en el brazo izquierdo por " +
                                dmg,
                            "red",
                            1,
                            0,
                            vars.clients[idUserAttacked]
                        );
                        handleProtocol.console(
                            "Le has pegado a " +
                                userAttacked.nameCharacter +
                                " en el brazo izquierdo por " +
                                dmg,
                            "red",
                            1,
                            0,
                            vars.clients[idUser]
                        );
                        break;
                    case vars.partesCuerpo.torso:
                        handleProtocol.console(
                            user.nameCharacter +
                                " te ha pegado en el torso por " +
                                dmg,
                            "red",
                            1,
                            0,
                            vars.clients[idUserAttacked]
                        );
                        handleProtocol.console(
                            "Le has pegado a " +
                                userAttacked.nameCharacter +
                                " en el torso por " +
                                dmg,
                            "red",
                            1,
                            0,
                            vars.clients[idUser]
                        );
                        break;
                }

                if (userAttacked.hp > 0 && game.puedeApu(idUser)) {
                    game.apuUser(idUser, idUserAttacked, dmg);
                }

                game.loopArea(vars.clients[idUser], function(target) {
                    if (!target.isNpc) {
                        handleProtocol.playSound(
                            user.id,
                            vars.arSounds.SND_IMPACTO,
                            vars.clients[client.id]
                        );
                    }
                });
            } else {
                var rechazo = false;

                if (userAttacked.idItemShield) {
                    var skillDefensa = game.getSkillDefensa(idUserAttacked);
                    var skillTacticasCombate = game.getSkillTacticasCombate(
                        idUserAttacked
                    );

                    if (skillDefensa + skillTacticasCombate > 0) {
                        var probRechazo = Math.max(
                            10,
                            Math.min(
                                90,
                                (100 * skillDefensa) / skillDefensa +
                                    skillTacticasCombate
                            )
                        );

                        rechazo =
                            funct.randomIntFromInterval(1, 100) <= probRechazo;
                    }
                }

                dmg = "¡Fallas!";

                if (rechazo) {
                    handleProtocol.console(
                        "¡Has bloqueado el golpe con el escudo a " +
                            user.nameCharacter +
                            "!",
                        "red",
                        1,
                        0,
                        vars.clients[idUserAttacked]
                    );
                    handleProtocol.console(
                        userAttacked.nameCharacter +
                            " te ha bloqueado el ataque con el escudo.",
                        "red",
                        1,
                        0,
                        vars.clients[idUser]
                    );

                    game.loopArea(vars.clients[idUser], function(target) {
                        if (!target.isNpc) {
                            handleProtocol.playSound(
                                user.id,
                                vars.arSounds.SND_ESCUDO,
                                vars.clients[client.id]
                            );
                        }
                    });
                } else {
                    handleProtocol.console(
                        user.nameCharacter + " ha fallado un golpe.",
                        "red",
                        1,
                        0,
                        vars.clients[idUserAttacked]
                    );
                    handleProtocol.console(
                        "Le has fallado un golpe a  " +
                            userAttacked.nameCharacter,
                        "red",
                        1,
                        0,
                        vars.clients[idUser]
                    );

                    game.loopArea(vars.clients[idUser], function(target) {
                        if (!target.isNpc) {
                            handleProtocol.playSound(
                                user.id,
                                vars.arSounds.SND_SWING,
                                vars.clients[client.id]
                            );
                        }
                    });
                }
            }

            if (userAttacked.meditar) {
                userAttacked.meditar = false;

                handleProtocol.console(
                    "Terminas de meditar.",
                    "white",
                    0,
                    0,
                    vars.clients[idUserAttacked]
                );

                game.loopArea(vars.clients[idUserAttacked], function(client) {
                    if (!client.isNpc) {
                        handleProtocol.animFX(
                            idUserAttacked,
                            0,
                            vars.clients[client.id]
                        );
                    }
                });
            }

            return dmg;
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [apuNpc description]
     * @param  {[type]} idUser [description]
     * @param  {[type]} idNpc  [description]
     * @param  {[type]} dmg    [description]
     * @return {[type]}        [description]
     */
    game.apuNpc = function(idUser, idNpc, dmg) {
        try {
            var user = vars.personajes[idUser];
            var npc = vars.npcs[idNpc];

            var probExito = 0;
            var skillApu = game.getSkillApu(idUser);

            if (user.idClase == vars.clases.asesino) {
                probExito = 24;
            } else if (
                user.idClase == vars.clases.clerigo ||
                user.idClase == vars.clases.paladin
            ) {
                probExito = parseInt(
                    ((0.000003 * skillApu + 0.0006) * skillApu + 0.0107) *
                        skillApu +
                        4.93
                );
            } else {
                probExito = parseInt(0.0361 * skillApu + 4.39);
            }

            if (funct.randomIntFromInterval(0, 100) < probExito) {
                npc.hp -= dmg * 2;

                handleProtocol.console(
                    "¡Has apuñalado a " +
                        npc.nameCharacter +
                        " por " +
                        dmg * 2 +
                        "!",
                    "red",
                    1,
                    0,
                    vars.clients[idUser]
                );

                game.calcularExp(idUser, idNpc, dmg * 2);
            }
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [apuUser description]
     * @param  {[type]} idUser         [description]
     * @param  {[type]} idUserAttacked [description]
     * @param  {[type]} dmg            [description]
     * @return {[type]}                [description]
     */
    game.apuUser = function(idUser, idUserAttacked, dmg) {
        try {
            var user = vars.personajes[idUser];
            var userAttacked = vars.personajes[idUserAttacked];

            var probExito = 0;
            var skillApu = game.getSkillApu(idUser);

            var tmpDmg = 0;

            if (user.idClase == vars.clases.asesino) {
                probExito = parseInt(
                    ((0.00003 * skillApu - 0.002) * skillApu + 0.098) *
                        skillApu +
                        4.25
                );
            } else if (
                user.idClase == vars.clases.clerigo ||
                user.idClase == vars.clases.paladin
            ) {
                probExito = parseInt(
                    ((0.000003 * skillApu + 0.0006) * skillApu + 0.0107) *
                        skillApu +
                        4.93
                );
            } else {
                probExito = parseInt(0.0361 * skillApu + 4.39);
            }

            if (funct.randomIntFromInterval(0, 100) < probExito) {
                if (user.idClase == vars.clases.asesino) {
                    tmpDmg = parseInt(dmg * 1.4);
                    userAttacked.hp -= tmpDmg;
                } else {
                    tmpDmg = parseInt(dmg * 1.5);
                    userAttacked.hp -= tmpDmg;
                }

                handleProtocol.console(
                    "¡Has apuñalado a " +
                        userAttacked.nameCharacter +
                        " por " +
                        tmpDmg +
                        "!",
                    "red",
                    1,
                    0,
                    vars.clients[idUser]
                );
                handleProtocol.console(
                    user.nameCharacter + " te ha apuñalado por " + tmpDmg + "!",
                    "red",
                    1,
                    0,
                    vars.clients[idUserAttacked]
                );
            }
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [getSkillTacticasCombate description]
     * @param  {[type]} idUser [description]
     * @return {[type]}        [description]
     */
    game.getSkillTacticasCombate = function(idUser) {
        try {
            var user = vars.personajes[idUser];

            var skillTacticasCombate = user.level * 3;

            if (skillTacticasCombate > 100) {
                skillTacticasCombate = 100;
            }

            return skillTacticasCombate;
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [getSkillDefensa description]
     * @param  {[type]} idUser [description]
     * @return {[type]}        [description]
     */
    game.getSkillDefensa = function(idUser) {
        try {
            var user = vars.personajes[idUser];

            var skillDefensa = user.level * 3;

            if (skillDefensa > 100) {
                skillDefensa = 100;
            }

            return skillDefensa;
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [getSkillArmas description]
     * @param  {[type]} idUser [description]
     * @return {[type]}        [description]
     */
    game.getSkillArmas = function(idUser) {
        try {
            var user = vars.personajes[idUser];

            var skillArmas = user.level * 3;

            if (skillArmas > 100) {
                skillArmas = 100;
            }

            return skillArmas;
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [getSkillApu description]
     * @param  {[type]} idUser [description]
     * @return {[type]}        [description]
     */
    game.getSkillApu = function(idUser) {
        try {
            var user = vars.personajes[idUser];

            var skillApu = user.level * 3;

            if (skillApu > 100) {
                skillApu = 100;
            }

            return skillApu;
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [puedeApu description]
     * @param  {[type]} idUser [description]
     * @return {[type]}        [description]
     */
    game.puedeApu = function(idUser) {
        try {
            var user = vars.personajes[idUser];

            if (!user.idItemWeapon) {
                return false;
            }

            var itemInventary = user.inv[user.idItemWeapon];
            var idItem = itemInventary.idItem;
            var itemWeapon = vars.datObj[idItem];

            if (!itemWeapon.apu) {
                return false;
            }

            var skillApu = game.getSkillApu(idUser);

            if (skillApu < 10 && user.idClase != vars.clases.asesino) {
                return false;
            } else {
                return true;
            }
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [poderEvasion description]
     * @param  {[type]} idUser [description]
     * @return {[type]}        [description]
     */
    game.poderEvasion = function(idUser) {
        try {
            var user = vars.personajes[idUser];

            var skillTacticasCombate = game.getSkillTacticasCombate(idUser);

            var tmpCalc =
                (skillTacticasCombate +
                    (skillTacticasCombate / 33) * user.attrAgilidad) *
                vars.modEvasion[user.idClase];

            return tmpCalc + 2.5 * Math.max(user.level - 12, 0);
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [poderEvasionEscudo description]
     * @param  {[type]} idUser [description]
     * @return {[type]}        [description]
     */
    game.poderEvasionEscudo = function(idUser) {
        try {
            var user = vars.personajes[idUser];

            var skillDefensa = game.getSkillDefensa(idUser);

            return (skillDefensa * vars.modEscudo[user.idClase]) / 2;
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [poderAtaqueArma description]
     * @param  {[type]} idUser [description]
     * @return {[type]}        [description]
     */
    game.poderAtaqueArma = function(idUser) {
        try {
            var user = vars.personajes[idUser];

            var skillArmas = game.getSkillArmas(idUser);
            var poderAtaqueArmaTmp = 0;

            if (user.idItemWeapon) {
                var itemWeapon = vars.datObj[user.idItemWeapon];

                if (itemWeapon.proyectil) {
                    poderAtaqueArmaTmp =
                        (skillArmas + 3 * user.attrAgilidad) *
                        vars.modAtaqueProyectiles[user.idClase];
                } else {
                    poderAtaqueArmaTmp =
                        (skillArmas + 3 * user.attrAgilidad) *
                        vars.modAtaqueArmas[user.idClase];
                }
            } else {
                poderAtaqueArmaTmp =
                    (skillArmas + 3 * user.attrAgilidad) *
                    vars.modAtaqueWrestling[user.idClase];
            }

            return poderAtaqueArmaTmp + 2.5 * Math.max(user.level - 12, 0);
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [calcularExp description]
     * @param  {[type]} idUser [description]
     * @param  {[type]} idNpc  [description]
     * @param  {[type]} dmg    [description]
     * @return {[type]}        [description]
     */
    game.calcularExp = function(idUser, idNpc, dmg) {
        try {
            var user = vars.personajes[idUser];
            var npc = vars.npcs[idNpc];

            if (dmg < 0) {
                dmg = 0;
            }

            if (dmg > npc.minHp) {
                dmg = npc.minHp;
            }

            var exp = parseInt(
                dmg * (npc.exp / npc.maxHp) * vars.multiplicadorExp
            );

            if (!exp) {
                return;
            }

            if (vars.dobleExp) {
                exp *= 2;
            }

            user.exp += exp;

            handleProtocol.console(
                "¡Has ganado " + exp + " puntos de experiencia!",
                "red",
                1,
                0,
                vars.clients[idUser]
            );

            game.checkUserLevel(idUser);
        } catch (err) {
            funct.dumpError(err);
        }
    };
};
