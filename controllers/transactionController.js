/**
 * Controller for transactions
 * Containing CRUD operations for each column
 */

const dotenv = require('dotenv');
dotenv.config();

// Do pg connection
var pg = require('pg');
var conString = `postgres://${process.env.DB_USER}:${process.env.DB_PW}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
var client = new pg.Client(conString);
client.connect();

 /* Display transactions */
 exports.transaction_list = function(req, res) {
    client.query('SELECT * FROM transactions', (error, results) => {
        if(error) {
            throw error;
        }
        res.status(200).json(results.rows);
    })
 };

 /* Show transaction details */
 exports.transaction_details = function(req, res) {
     const customerqrcode = req.params.id;

     client.query('SELECT * FROM transactions WHERE customerqrcode = $1', [customerqrcode], (error, results) => {
         if(error) {
             throw error;
         }
         res.status(200).json(results.rows);
     })
 };

 /* Create a new transaction with POST */
 exports.transaction_create_post = function(req, res) {
    // Get posted data from request body 
    const {
        CustomerID,
        CustomerQRCode,
        Price,
        cupqrcode,
        InsertTime
     } = req.body;

     // Insert all given entries into Transaction table
     client.query('INSERT INTO transactions("CustomerID", customerqrcode, "Price", "CupQRCode", "InsertTime")' +
                'VALUES ($1, $2, $3, $4, $5)', [CustomerID, CustomerQRCode, Price, cupqrcode, InsertTime], (error, results) => {
                    if(error) {
                        throw error;
                    }
                    res.status(201).send('Transaction added for for customer QR code: ' + CustomerQRCode);
                })
 };

 /* Update an existing transaction with POST */
 exports.transaction_update_post = function(req, res) {
    // Get posted data from request body 
    const customerqrcode = req.params.id;
    const {
        CustomerID,
        customerQRcode,
        Price,
        cupqrcode,
        InsertTime
     } = req.body;

    client.query('UPDATE transactions SET' + 
                '"CustomerID" = $1, customerqrcode = $2, "Price" = $3, "CupQRCode" = $4, "InsertTime" = $5', 
                [CustomerID, customerQRcode, Price, cupqrcode, InsertTime], (error, resulsts) => {
                    if(error) {
                        throw error;
                    }
                    res.status(200).send('Updated transaction with customer QR code: ' + customerqrcode);
                });
 };