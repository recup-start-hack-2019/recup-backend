/** @module crypto */

var crypto = require("crypto");
var crypto_utils = require("./crypto-utils.js");
var ECPair = require("./ecpair.js");
var ECSignature = require("./ecsignature.js");
var bs58check = require('bs58check')

if (typeof Buffer === "undefined") {
	Buffer = require("buffer/").Buffer;
}

var ByteBuffer = require("bytebuffer");

function isECPair(obj) { return obj instanceof ECPair }

function getId(transaction) {
	return crypto.createHash("sha256").update(getBytes(transaction)).digest().toString("hex");
}

function getHash(transaction, skipSignature, skipSecondSignature) {
	return crypto.createHash("sha256").update(getBytes(transaction, skipSignature, skipSecondSignature)).digest();
}

function getBytesHash(bytes) {
	return crypto.createHash("sha256").update(bytes).digest();
}

function sign(transaction, keys) {

	var hash = getHash(transaction, true, true)

	var signature = keys.sign(hash).toDER().toString("hex")

	if (!transaction.signature) { transaction.signature = signature }

	return signature

}

function signBytes(bytes, keys) {
	var hash = getBytesHash(bytes)
	var signature = keys.sign(hash).toDER().toString("hex");
	return signature;
}

function verifySignature(hashBytes, signatureBytes, publicKeyBytes) {

	var ecpair = ECPair.fromPublicKeyBuffer(publicKeyBytes, 0x17);
	var ecsignature = ECSignature.fromDER(signatureBytes);
	var res = ecpair.verify(hashBytes, ecsignature);

	return res;
}

function getKeys(secret, network) {
	var ecpair = ECPair.fromSeed(secret, network || networks.ark);

	ecpair.publicKey = ecpair.getPublicKeyBuffer().toString("hex");
	ecpair.privateKey = '';

	return ecpair;
}

function getAddress(publicKey, version) {
	if (!version) {
		version = networkVersion;
	}
	var buffer = crypto_utils.ripemd160(new Buffer(publicKey, 'hex'));

	var payload = new Buffer(21);
	payload.writeUInt8(version, 0);
	buffer.copy(payload, 1);

	return bs58check.encode(payload);
}

function validateAddress(address, version) {
	if (!version) {
		version = networkVersion;
	}
	try {
		var decode = bs58check.decode(address);
		return decode[0] == version;
	} catch (e) {
		return false;
	}
}

module.exports = {
	getHash: getHash,
	getId: getId,
	sign: sign,
	getBytesHash: getBytesHash,
	signBytes: signBytes,
	verifySignature: verifySignature,
	getKeys: getKeys,
	getAddress: getAddress,
	validateAddress: validateAddress,
	isECPair: isECPair
}
