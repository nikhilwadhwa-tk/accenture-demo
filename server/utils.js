//
//  utils.js
//
//  Copyright © 2016 Trusted Key Solutions. All rights reserved.
//

const Crypto    = require('crypto')
const Jsrsasign = require('jsrsasign')

/**
 * Static Trustedkey utility functions
 *
 * @exports utils
*/
const utils = module.exports = {}

/**
 * Convert a certificate serial number to blockchain address
 *
 * @param {String} serialhex - Hex encoded serial number
 * @returns {String} 0x prefixed address
 */
utils.serialToAddress = function(serialhex) {
    const paddedSerial = String('00000000000000000000000000000000000000'+serialhex).slice(-40)
    return "0x" + paddedSerial
}

/**
 * Base64 encode URL string
 *
 * @param {String} urlString - URL string to encode
 * @returns {String} base64-encoded URL
 */
utils.base64url = function(urlString) {
    return Buffer.from(urlString).toString("base64").replace(/=/g,'').replace(/\//g,'_').replace(/\+/g,'-')
}

/**
 * Get UTC seconds since UNIX epoch or convert date into unix time
 *
 * @param {Date} date - Optional date object
 * @returns {number} Unix timestamp
 */
utils.getUnixTime = function(date) {
    return Math.floor((date||new Date).getTime()/1000)
}


/**
 * Create a JSON Web Signature
 *
 * @param {object} message - Message can be string or object. Objects will be JSON stringified
 * @param {String} secret - HMAC shared secret
 * @param {object} [header={alg: "HS256"}] - JOSE header
 * @returns {String} Concatenated JWS HMAC
 */
utils.createHmacJws = function(message, secret, header) {
    if (typeof message !== 'string') {
        message = JSON.stringify(message)
    }
    if (typeof header === 'undefined') {
        header = {}
    }
    header.alg = "HS256"
    const jose = JSON.stringify(header)
    const jws = utils.base64url(jose) + '.' + utils.base64url(message)
    const hmac = Crypto.createHmac('sha256', secret)
    return jws + '.' + utils.base64url(hmac.update(jws, secret).digest())
}


/**
 * Verify a JSON Web Signature
 *
 * @param {object} message - Message can be string or object. Objects will be JSON stringified
 * @param {String} secret - HMAC shared secret
 * @param {object} header - JOSE header
 * @returns {boolean}
 */
utils.verifyJws = function(jws, secretCallback) {

    const parts = jws.split(/\./g)
    if (parts.length !== 3) {       // JWE has 5 parts
        return false
    }

    const jose = JSON.parse(Buffer.from(parts[0], "base64"))
    const message = Buffer.from(parts[1], "base64")
    const signature = Buffer.from(parts[2], "base64")
    const signeddata = parts[0] + '.' + parts[1]

    if (jose.alg === 'ES256') {
        // ECDSA-SHA256
        const claims = JSON.parse(message)
        // Subject public key is stored in 'sub' claim
        if (utils.checkECDSA("secp256r1", signeddata, secretCallback(jose, claims), signature.toString('hex'))) {
            return claims
        }
        return false
    }
    else if (jose.alg === 'HS256') {
        // HMAC-SHA256
        const hmac = Crypto.createHmac('sha256', secretCallback(jose))
        if (hmac.update(signeddata).digest().equals(signature)) {
            // Verify any nested JWT
            if (jose.cty === "JWT") {
                return utils.verifyJws(message.toString(), secretCallback)
            }
            else {
                return JSON.parse(message.toString())
            }
        }
    }
    else if (jose.alg === 'RS256') {
        // TODO
        return false
    }
    else if (jose.alg === 'none') {
        // NONE, only allow if callback returns empty string
        const claims = JSON.parse(message)
        if (signature === '' && secretCallback(jose, claims) === '') {
            return claims
        }
    }

    return false
}


/**
 * Verify an ECDSA named curve signed message
 *
 * @param {String} curveName - Curve name (secp256r1)
 * @param {String} message - Message payload
 * @param {String} pubkey - Public key to check signature against
 * @param {String} signature - Signature payload
 * @return {boolean} Indicate whether signature is correct
 */
utils.checkECDSA = function(curveName, message, pubkey, signature) {

    // Verify a digest value
    var hash = Crypto.createHash('sha256')
    var digest = hash.update(message).digest().toString('hex')

    var curve = new Jsrsasign.KJUR.crypto.ECDSA({xy:pubkey,curve:curveName})
    return curve.verifyHex(digest, signature, pubkey)
}


/**
 * Convert a user public key to blockchain address
 *
 * @param {String} pubkeyhex - User public key (hex encoded)
 * @returns {String} User address with leading 0x
 */
utils.userPubKeyHexToAddress = function(pubkeyhex) {
    // Sign a digest value
    var hash = Crypto.createHash('sha256')
    // Get the uncompressed public key without prefix, take the sha256 hash, and skip the first 12 bytes
    var blob = new Buffer(pubkeyhex.substr(2), 'hex')
    var digest = hash.update(blob).digest()
    return "0x" + digest.toString('hex').substr(2*12)
}


/**
 * Wrap the call and change the callback into a promise resolve or reject.
 */
utils.promisify = function(call) {
    return function() {
        // Save the 'this' reference for use inside the promise
        var self = this;
        var args = Array.prototype.slice.call(arguments);
        return new Promise( (resolve,reject) => {
            // Append the callback that either rejects or resolves the promise
            args.push( (err,result) => err?reject(err):resolve(result) );
            call.apply(self, args);
        })
    }
}