var vars = require("../vars");
var funct = require("../functions");

module.exports = function addNpcMethods(game) {
    /**
     * [respawnNpc Devuelve la posición de nacimiento del nuevo NPC]
     * @param  {number} map        [description]
     * @param  {boolean} aguaValida [description]
     * @return {Object}            [description]
     */
    game.respawnNpc = function(map, aguaValida) {
        try {
            var posNewX = funct.randomIntFromInterval(1, 100);
            var posNewY = funct.randomIntFromInterval(1, 100);

            var count = 0;

            while (
                !game.validPosRespawn(
                    {
                        x: posNewX,
                        y: posNewY
                    },
                    map,
                    aguaValida
                )
            ) {
                posNewX = funct.randomIntFromInterval(1, 100);
                posNewY = funct.randomIntFromInterval(1, 100);

                count++;

                if (count > 10000) {
                    console.log("<<<>>> EXPLOTO UN NPC EN EL MAPA " + map);

                    return {
                        posNewX: funct.randomIntFromInterval(1, 100),
                        posNewY: funct.randomIntFromInterval(1, 100)
                    };
                }
            }

            return {
                posNewX: posNewX,
                posNewY: posNewY
            };
        } catch (err) {
            funct.dumpError(err);
        }
    };

    /**
     * [validPosRespawn description]
     * @param  {[type]} pos        [description]
     * @param  {[type]} map        [description]
     * @param  {[type]} aguaValida [description]
     * @return {[type]}            [description]
     */
    game.validPosRespawn = function(pos, map, aguaValida) {
        try {
            if (
                game.legalPos(pos.x, pos.y, map, aguaValida) &&
                !game.isTelep(pos.x, pos.y)
            ) {
                return true;
            } else {
                return false;
            }
        } catch (err) {
            funct.dumpError(err);
        }
    };
};
