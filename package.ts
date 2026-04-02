const ByteBuffer = require("bytebuffer");

// ── Packet ID types ───────────────────────────────────────────────────────────
// clientPacketID  = paquetes que el SERVIDOR envía al cliente
// serverPacketID  = paquetes que el CLIENTE envía al servidor

export const ClientPacketID = {
    getMyCharacter:    1,
    getCharacter:      2,
    changeRopa:        3,
    actPosition:       4,
    changeHeading:     5,
    deleteCharacter:   6,
    dialog:            7,
    console:           8,
    pong:              9,
    animFX:            10,
    inmo:              11,
    updateHP:          12,
    updateMaxHP:       13,
    updateMana:        14,
    telepMe:           15,
    actOnline:         19,
    consoleOnline:     20,
    actPositionServer: 21,
    actExp:            22,
    actMyLevel:        23,
    actGold:           24,
    actColorName:      25,
    changeHelmet:      26,
    changeWeapon:      27,
    error:             28,
    changeName:        29,
    getNpc:            30,
    changeShield:      31,
    putBodyAndHeadDead:32,
    revivirUsuario:    33,
    quitarUserInvItem: 34,
    renderItem:        35,
    deleteItem:        36,
    agregarUserInvItem:37,
    changeArrow:       38,
    blockMap:          39,
    changeObjIndex:    40,
    openTrade:         41,
    aprenderSpell:     42,
    closeForce:        43,
    nameMap:           44,
    changeBody:        45,
    navegando:         46,
    updateAgilidad:    47,
    updateFuerza:      48,
    playSound:         49
} as const;

export const ServerPacketID = {
    changeHeading:   1,
    click:           2,
    useItem:         3,
    equiparItem:     4,
    connectCharacter:5,
    position:        6,
    dialog:          7,
    ping:            8,
    attackMele:      9,
    attackRange:     10,
    attackSpell:     11,
    tirarItem:       12,
    agarrarItem:     13,
    buyItem:         14,
    sellItem:        15,
    changeSeguro:    17
} as const;

export type ClientPacketName  = keyof typeof ClientPacketID;
export type ClientPacketValue = typeof ClientPacketID[ClientPacketName];
export type ServerPacketName  = keyof typeof ServerPacketID;
export type ServerPacketValue = typeof ServerPacketID[ServerPacketName];

// ── Package class ─────────────────────────────────────────────────────────────

class Package {
    clientPacketID: typeof ClientPacketID;
    serverPacketID: typeof ServerPacketID;
    bufferRcv: any;
    bufferSnd: any;

    constructor() {
        this.clientPacketID = ClientPacketID;
        this.serverPacketID = ServerPacketID;
        this.bufferRcv = new ByteBuffer(ByteBuffer.DEFAULT_CAPACITY, true);
        this.bufferSnd = new ByteBuffer(ByteBuffer.DEFAULT_CAPACITY, true);
    }

    setData(data: ArrayBuffer): void {
        this.bufferRcv = ByteBuffer.wrap(data, "utf8", true);
    }

    getPackageID(): ServerPacketValue {
        return this.getByte() as ServerPacketValue;
    }

    setPackageID(packageID: ClientPacketValue | number): void {
        this.bufferSnd = new ByteBuffer(ByteBuffer.DEFAULT_CAPACITY, true);
        this.writeByte(packageID);
    }

    writeByte(numByte: number | boolean, signed?: boolean): void {
        let val: number;
        if (numByte === true)       val = 1;
        else if (numByte === false) val = 0;
        else                        val = (numByte as number) || 0;

        if (signed) {
            this.bufferSnd.writeInt8(parseInt(String(val)));
        } else {
            this.bufferSnd.writeUint8(parseInt(String(val)));
        }
    }

    writeShort(numShort: number, signed?: boolean): void {
        const val = numShort || 0;
        if (signed) {
            this.bufferSnd.writeInt16(parseInt(String(val)));
        } else {
            this.bufferSnd.writeUint16(parseInt(String(val)));
        }
    }

    writeInt(numInt: number, signed?: boolean): void {
        const val = numInt || 0;
        if (signed) {
            this.bufferSnd.writeInt32(parseInt(String(val)));
        } else {
            this.bufferSnd.writeUint32(parseInt(String(val)));
        }
    }

    writeFloat(numFloat: number): void {
        this.bufferSnd.writeFloat(parseInt(String(numFloat || 0)));
    }

    writeDouble(numDouble: number): void {
        this.bufferSnd.writeDouble(parseInt(String(numDouble || 0)));
    }

    writeString(dataString: string): void {
        const str = dataString || "";
        this.writeShort(ByteBuffer.calculateUTF8Chars(str));
        this.bufferSnd.writeString(str);
    }

    getByte(signed?: boolean): number {
        return signed ? this.bufferRcv.readInt8() : this.bufferRcv.readUint8();
    }

    getShort(signed?: boolean): number {
        return signed ? this.bufferRcv.readInt16() : this.bufferRcv.readUint16();
    }

    getInt(signed?: boolean): number {
        return signed ? this.bufferRcv.readInt32() : this.bufferRcv.readUint32();
    }

    getFloat(): number {
        return this.bufferRcv.readFloat();
    }

    getDouble(): number {
        return this.bufferRcv.readDouble();
    }

    getString(): string {
        const length = this.getShort();
        return this.bufferRcv.readString(length, ByteBuffer.METRICS_CHARS);
    }

    dataSend(): Buffer {
        this.bufferSnd.flip();
        return this.bufferSnd.toBuffer();
    }
}

const pkg = new Package();
export = pkg;
