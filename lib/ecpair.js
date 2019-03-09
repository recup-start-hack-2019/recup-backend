var base58check = require('bs58check')
var bcrypto = require('./crypto-utils')
var ecdsa = require('./ecdsa')
var ECSignature = require('./ecsignature')
var randomBytes = require('randombytes')
var typeforce = require('typeforce')
var types = require('./types')
var wif = require('wif')

var BigInteger = require('bigi')

var ecurve = require('ecurve')
var secp256k1 = ecurve.getCurveByName('secp256k1')

var secp256k1native = require('secp256k1')

function ECPair(d, Q, options) {
	if (options) {
		typeforce({
			compressed: types.maybe(types.Boolean)
		}, options)
	}

	options = options || {}

	if (d) {
		if (d.signum() <= 0) throw new Error('Private key must be greater than 0')
		if (d.compareTo(secp256k1.n) >= 0) throw new Error('Private key must be less than the curve order')
		if (Q) throw new TypeError('Unexpected publicKey parameter')

		this.d = d
	} else {
		typeforce(types.ECPoint, Q)

		this.__Q = Q
	}

/** @type {boolean} */ this.compressed = options.compressed === undefined ? true : options.compressed
/** @type {Network} */ this.network = options.network || 0x17
}

Object.defineProperty(ECPair.prototype, 'Q', {
	get: function () {
		if (!this.__Q && this.d) {
			this.__Q = secp256k1.G.multiply(this.d)
		}

		return this.__Q
	}
})

ECPair.fromPublicKeyBuffer = function (buffer) {
	var Q = ecurve.Point.decodeFrom(secp256k1, buffer)

	return new ECPair(null, Q, {
		compressed: Q.compressed
	})
}

/**
 * @param {object} [options]
 * @param {function} [options.rng]
 * @param {boolean} [options.compressed=true]
 * @param {Network} [options.network=networks.ark]
 */
ECPair.makeRandom = function (options) {
	options = options || {}

	var rng = options.rng || randomBytes

	var d
	do {
		var buffer = rng(32)
		typeforce(types.Buffer256bit, buffer)

		d = BigInteger.fromBuffer(buffer)
	} while (d.signum() <= 0 || d.compareTo(secp256k1.n) >= 0)

	return new ECPair(d, null, options)
}

/**
 * @param {string} seed
 * @param {object} [options]
 * @param {boolean} [options.compressed=true]
 * @param {Network} [options.network=networks.ark]
 * @returns {ECPair}
 */
ECPair.fromSeed = function (seed, options) {
	var hash = bcrypto.sha256(new Buffer(seed, "utf-8"))
	var d = BigInteger.fromBuffer(hash)
	if (d.signum() <= 0 || d.compareTo(secp256k1.n) >= 0) {
		throw new Error("seed cannot resolve to a compatible private key")
	}
	else {
		return new ECPair(d, null, options)
	}
}

/**
 * @returns {string}
 */
ECPair.prototype.getAddress = function () {
	var payload = new Buffer(21)
	var publicKeyBuffer = this.getPublicKeyBuffer()
	// console.log(publicKeyBuffer.toString('hex'));
	var hash = bcrypto.ripemd160(publicKeyBuffer)
	// console.log("Hash "+hash.toString("hex"))
	var version = this.getNetwork().pubKeyHash
	payload.writeUInt8(version, 0)
	hash.copy(payload, 1)
	// console.log("Payload: "+payload.toString("hex"));
	return base58check.encode(payload)
}

/**
 * @returns {Network}
 */
ECPair.prototype.getNetwork = function () {
	return this.network
}

ECPair.prototype.getPublicKeyBuffer = function () {
	return this.Q.getEncoded(this.compressed)
}

/**
 * Requires a private key (`d`) to be set.
 *
 * @param {Buffer} hash
 * @returns {ECSignature}
 */
ECPair.prototype.sign = function (hash) {
	if (!this.d) throw new Error('Missing private key')
	var native = secp256k1native.sign(hash, this.d.toBuffer(32))
	return ECSignature.parseNativeSecp256k1(native).signature
}

/**
 * Requires a private key (`d`) to be set.
 *
 * @returns {string}
 */
ECPair.prototype.toWIF = function () {
	if (!this.d) throw new Error('Missing private key')

	return wif.encode(this.network.wif, this.d.toBuffer(32), this.compressed)
}

/**
 * @param {Buffer} hash
 * @returns {boolean}
 */
ECPair.prototype.verify = function (hash, signature) {
	return secp256k1native.verify(hash, signature.toNativeSecp256k1(), this.Q.getEncoded(this.compressed))
}

module.exports = ECPair
