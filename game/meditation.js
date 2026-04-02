var vars = require("../vars");
var funct = require("../functions");
var handleProtocol = require("../handleProtocol");

module.exports = function addMeditationMethods(game) {
    /**
     * [accionMeditar description]
     * @param  {[type]} idUser [description]
     * @return {[type]}        [description]
     */
    game.accionMeditar = function(idUser) {
        try {
            var user = vars.personajes[idUser];

            if (user.meditar) {
                user.meditar = false;

                handleProtocol.console(
                    "Terminas de meditar.",
                    "white",
                    0,
                    0,
                    vars.clients[idUser]
                );

                game.loopArea(vars.clients[idUser], function(client) {
                    if (!client.isNpc) {
                        handleProtocol.animFX(
                            idUser,
                            0,
                            vars.clients[client.id]
                        );
                    }
                });

                return;
            }

            if (user.dead) {
                handleProtocol.console(
                    "Los muertos no pueden meditar.",
                    "white",
                    0,
                    0,
                    vars.clients[idUser]
                );
                return;
            }

            if (!user.maxMana) {
                handleProtocol.console(
                    "Solo las clases mágicas pueden meditar.",
                    "white",
                    0,
                    0,
                    vars.clients[idUser]
                );
                return;
            }

            if (user.mana == user.maxMana) {
                handleProtocol.console(
                    "Tienes la maná al máximo.",
                    "white",
                    0,
                    0,
                    vars.clients[idUser]
                );
                return;
            }

            var fxMeditar = 0;

            if (user.level < 13) {
                fxMeditar = vars.meditacion.chica;
            } else if (user.level < 25) {
                fxMeditar = vars.meditacion.mediana;
            } else if (user.level < 35) {
                fxMeditar = vars.meditacion.grande;
            } else if (user.level < 42) {
                fxMeditar = vars.meditacion.xgrande;
            } else {
                fxMeditar = vars.meditacion.xxgrande;
            }

            game.loopArea(vars.clients[idUser], function(client) {
                if (!client.isNpc) {
                    handleProtocol.animFX(
                        idUser,
                        fxMeditar,
                        vars.clients[client.id]
                    );
                }
            });

            user.meditar = true;
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [meditar description]
     * @param  {[type]} idUser [description]
     * @return {[type]}        [description]
     */
    game.meditar = function(idUser) {
        try {
            var user = vars.personajes[idUser];

            var cantMana = parseInt((user.maxMana * 6) / 100);

            if (user.maxMana <= user.mana + cantMana) {
                cantMana = user.maxMana - user.mana;
            }

            user.mana += cantMana;

            handleProtocol.updateMana(user.mana, vars.clients[idUser]);

            handleProtocol.console(
                "¡Has recuperado " + cantMana + " puntos de maná!",
                "white",
                0,
                0,
                vars.clients[idUser]
            );

            if (user.maxMana == user.mana) {
                user.meditar = false;

                handleProtocol.console(
                    "Terminas de meditar.",
                    "white",
                    0,
                    0,
                    vars.clients[idUser]
                );

                game.loopArea(vars.clients[idUser], function(client) {
                    if (!client.isNpc) {
                        handleProtocol.animFX(
                            idUser,
                            0,
                            vars.clients[client.id]
                        );
                    }
                });
            }
        } catch (err) {
            funct.dumpError(err);
        }
    };
};
