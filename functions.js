const fetch = require("node-fetch");
const pino = require("pino");

const logger = pino({
    level: process.env.LOG_LEVEL || "info",
    transport: process.env.NODE_ENV !== "production"
        ? { target: "pino-pretty", options: { colorize: true } }
        : undefined
});

const funct = new Funct();

function Funct() {
    this.logger = logger;

    this.jsonEncode = function(data) {
        return JSON.stringify(data);
    };

    this.jsonDecode = function(data) {
        return JSON.parse(data);
    };

    this.dumpError = function(err) {
        if (typeof err === "object") {
            logger.error({ err }, err.message || "Error desconocido");
        } else {
            logger.error("dumpError :: argumento no es un objeto");
        }
    };

    this.randomIntFromInterval = function(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    };

    this.sign = function(x) {
        return x > 0 ? 1 : x < 0 ? -1 : 0;
    };

    this.dateFormat = function(date, fstr, utc) {
        utc = utc ? "getUTC" : "get";
        return fstr.replace(/%[YmdHMS]/g, function(m) {
            switch (m) {
                case "%Y":
                    return date[utc + "FullYear"]();
                case "%m":
                    m = 1 + date[utc + "Month"]();
                    break;
                case "%d":
                    m = date[utc + "Date"]();
                    break;
                case "%H":
                    m = date[utc + "Hours"]();
                    break;
                case "%M":
                    m = date[utc + "Minutes"]();
                    break;
                case "%S":
                    m = date[utc + "Seconds"]();
                    break;
                default:
                    return m.slice(1);
            }
            return ("0" + m).slice(-2);
        });
    };

    const apiUrl = process.env.CLIENT_API_URL || "http://localhost:3000/api";

    this.fetchUrl = async (url, options = {}) => {
        const response = await fetch(apiUrl + url, options);
        const result = await response.json();
        return result;
    };
}

module.exports = funct;
