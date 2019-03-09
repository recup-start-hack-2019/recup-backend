/**
 * Controller for transactions
 * Containing CRUD operations for each column
 */
const crypto = require('../lib/index')
const ByteBuffer = require('bytebuffer')
const JSum = require('jsum');
var apn = require('apn');

var secret = process.env.SEED;
var keypair = crypto.ECPair.fromSeed(secret)
var shoppubkey = keypair.getPublicKeyBuffer().toString('hex') // This is what the verifier gets

// Enum for transaction types / states of the cups
const transactionTypes = {
    CUSTOMER_REQUEST: 0, // initial state
    SHOP_DELIVER: 1,
    USER_ACCEPT: 2,
    MACHINE_TAKEN: 3
};

function byteLength(str) {
    // returns the byte length of an utf8 string
    var s = str.length;
    for (var i = str.length - 1; i >= 0; i--) {
        var code = str.charCodeAt(i);
        if (code > 0x7f && code <= 0x7ff) s++;
        else if (code > 0x7ff && code <= 0xffff) s += 2;
        if (code >= 0xDC00 && code <= 0xDFFF) i--; //trail surrogate
    }
    return s;
}

function unpack(str) {
    var bytes = [];
    for (var i = 0; i < str.length; i++) {
        var char = str.charCodeAt(i);
        bytes.push(char >>> 8);
        bytes.push(char & 0xFF);
    }
    return bytes;
}

function toBytes(str) {

    // First find out the size that the Buffer Object should have
    var bytelength = byteLength(str)
    var bytes = unpack(str)

    var bb = new ByteBuffer(bytelength, true)

    for (var i = 0; i < bytes.length; i++) {
        bb.writeByte(bytes[i]);
    }

    bb.flip()

    var arrayBuffer = new Uint8Array(bb.toArrayBuffer());
    var buffer = [];

    for (var i = 0; i < arrayBuffer.length; i++) {
        buffer[i] = arrayBuffer[i];
    }
    
    return new Buffer(buffer);

}

const dotenv = require('dotenv');
dotenv.config();

// Do pg connection
var pg = require('pg');
var conString = `postgres://${process.env.DB_USER}:${process.env.DB_PW}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
var client = new pg.Client(conString);
client.connect();

 /* Display transactions */
 exports.transaction_list = function(req, res) {
    console.log("Receiving GET transactions");

    client.query('SELECT * FROM transactions', (error, results) => {
        if(error) {
            throw error;
        }
        res.status(200).json(results.rows);
    })
 };

 /* Show transaction details */
 exports.transaction_details = function(req, res) {
    console.log("Receiving GET transaction details");
     const customerqrcode = req.params.id;

     client.query('SELECT * FROM transactions WHERE customerqrcode = $1', [customerqrcode], (error, results) => {
         if(error) {
             throw error;
         }
         res.status(200).json(results.rows);
     })
 };

 /* Create a new transaction with POST */
 exports.transaction_create_post = async function(req, res) {
    console.log("Receiving POST transaction create");

    // Get posted data from request body (the app does not send everything)
    const {
        customerpubkey,
        customersignature,
        cupqrcode,
        timestamp
    } = req.body;

    var userRequestHash = JSum.digest({
        pubkey: customerpubkey,
        timestamp: timestamp
    }, 'SHA256', 'hex')

    var senderPublicKeyBytes = new Buffer(customerpubkey, "hex");
    var customerSignatureBytes = new Buffer(customersignature, "hex");
    var hash = new Buffer(userRequestHash,'hex')

    // Validation User Request
    var requestValid = crypto.crypto.verifySignature(hash,customerSignatureBytes,senderPublicKeyBytes)

    // Stop if request is invalid
    if(!requestValid) res.status(500).send("Request invalid");

    // Do crypto stuff
    var hash = new Buffer(JSum.digest({
        senderPublicKey: shoppubkey,
        receiverPublicKey: customerpubkey,
        timestamp: timestamp,
        cupqrcode: cupqrcode,
        previousHash: userRequestHash,  // previous hash as well
        type: transactionTypes.SHOP_DELIVER
    }, 'SHA256', 'hex'), 'hex');
    
    console.log(JSum.digest(hash, 'SHA256', 'hex'));
    
    var signature = crypto.crypto.signBytes(hash, keypair);

    console.log("this is the signature: " + signature);

    //Do push notification here if everything is ok

    try {
        await pushNotification(shoppubkey, customerpubkey, timestamp, cupqrcode, hash, signature, type);    

        // Insert all given entries into Transaction table
        client.query('INSERT INTO transactions(senderpubkey, cupqrcode, inserttime, signature, receiver, previoushash, type)' +
        'VALUES ($1, $2, $3, $4, $5, $6, $7)', [shoppubkey, cupqrcode, timestamp, signature, customerpubkey, hash, transactionTypes.SHOP_DELIVER], (error, results) => {
            if(error) {
                throw error;
            }
            res.status(201).json('Transaction added for for cup: ' + cupqrcode);
        });
    } catch(e) {
        res.status(500).json(e);
    }
    
 };

 /* accept request action */
exports.transaction_accept_post = function(req, res) {
    console.log("Receiving POST transaction accept");

    // Get posted data from request body (the app does not send everything)
    const {
        customerpubkey,
        customersignature,
        cupqrcode,
        timestamp,
        previousHash,
        type
    } = req.body;

    var userResponseHash = JSum.digest({
        senderPublicKey: shoppubkey,
        receiverPublicKey: customerpubkey,
        timestamp: timestamp,
        cupqrcode: cupqrcode,
        previousHash: previousHash,
        type: type
    }, 'SHA256', 'hex');

    // Validation User Request
    var requestValid = crypto.crypto.verifySignature(
        new Buffer(userResponseHash,'hex'), 
        new Buffer(customersignature, "hex"), 
        new Buffer(customerpubkey, "hex"));

    // Stop if request is invalid
    if(!requestValid) res.status(500).json("Request invalid");

    //Do push notification here if everything is ok
    // todo: thanks notification

    try { 
        // Insert all given entries into Transaction table
        client.query('INSERT INTO transactions(senderpubkey, cupqrcode, inserttime, signature, receiver, previoushash, type)' +
        'VALUES ($1, $2, $3, $4, $5, $6, $7)', [shoppubkey, cupqrcode, timestamp, customersignature, customerpubkey, previousHash, transactionTypes.USER_ACCEPT], (error, results) => {
            if(error) {
                throw error;
            }
            res.status(201).json('Transaction accepted for cup: ' + cupqrcode + " by user: " + customerpubkey);
        });
    } catch(e) {
        res.status(500).json(e);
    }
};

exports.transaction_machine_accept = function(req, res) {
    console.log("POST request for machine accept process");

    const cupqrcode = req.body.cupqrcode;

    // Request to get not given data
    client.query('SELECT TOP 1 * FROM transaction WHERE cupqrcode = $1 AND type = $2 ORDER BY insertdate DESC', [cupqrcode, transactionTypes.USER_ACCEPT], (error, results) => {
        if(error) {
            throw error;
        }

        var customerpubkey = results.rows.senderpubkey;
        var cupqrcode = results.rows.cupqrcode;
        var timestamp = results.rows.inserttime;
        var machinesignature = results.rows.signature;
        var machinepubkey = results.rows.receiverpubkey;
        var previoushash = results.rows.previoushash;

        // Insert all given entries into Transaction table
        client.query('INSERT INTO transactions(senderpubkey, cupqrcode, inserttime, signature, receiver, previoushash, type)' +
        'VALUES ($1, $2, $3, $4, $5, $6, $7)', [customerpubkey, cupqrcode, timestamp, machinesignature, machinepubkey, previoushash, transactionTypes.MACHINE_TAKEN], (error, results) => {
            if(error) {
                throw error;
            }
            res.status(201).json('Transaction closed for cup: ' + cupqrcode + " by machine.");
        });
    });
};

exports.transaction_generate_hash = function(req, res) {
    console.log("POST JSUM request");

    const {
        obj
    } = req.body;

    var hash = JSum.digest(obj, 'SHA256', 'hex');
    console.log(hash);

    // Send back hash
    res.status(201).json(hash);
};

 async function pushNotification(senderPublicKey, receiverPublicKey, timestamp, cupqrcode, previousHash, signature, type) {

    var options = {
        token: {
            key: './key.p8',
            keyId: process.env.KEY_ID,
            teamId: process.env.TEAM_ID
        }
    };

    var apnProvider = new apn.Provider(options);

    let deviceToken = process.env.DEVICE_TOKEN;

    // actually create notification
    var note = new apn.Notification();

    note.expiry = Math.floor(Date.now() / 1000) + 3600;
    note.badge = 3;
    note.sound = "ping.aiff";
    note.alert = "\uD83D\uDCE7 \u2709 Please confirm transaction :)";
    note.payload = {
        "acceptTX": {
            'senderPublicKey': senderPublicKey,
            'receiverPublicKey': receiverPublicKey,
            'cupqrcode': cupqrcode,
            'timestamp': timestamp,
            'previousHash': previousHash,
            'signature': signature,
            'type': type
        }
    };
    note.topic = process.env.BUNDLE_ID;

    apnProvider.send(note, deviceToken).then((result) => {
        
    });
 }