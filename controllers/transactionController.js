/**
 * Controller for Transactions
 * Containing CRUD operations for each column
 */

const dotenv = require('dotenv');
dotenv.config();

// Build db
const Pool = require('pg').Pool;
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_NAME,
    password: process.env.DB_PW,
    port: process.env.DB_PORT
});

 /* Display transactions */
 exports.transaction_list = function(req, res) {
    pool.query('SELECT * FROM Transactions', (error, results) => {
        if(error) {
            throw error;
        }
        Response.status(200).json(results.rows);
    })
 };

 /* Show transaction details */
 exports.transaction_details = function(req, res) {
     const customer_QRcode = req.params.id;

     pool.query('SELECT * FROM Transactions WHERE customer_QRcode = $1', [customer_QRcode], (error, results) => {
         if(error) {
             throw error;
         }
         Response.status(200).json(results.rows);
     })
 };

 /* Create a new transaction with POST */
 exports.transaction_create_post = function(req, res) {
     
    // Get posted data from request body 
    const {
        customerID,
        customer_QRcode,
        price,
        cup_QRcode,
        currentInsertTime
     } = req.body;

     // Insert all given entries into Transaction table
     pool.query('INSERT INTO Transactions(customerID, customer_QRcode, price, cup_QRcode, currentInsertTime)' +
                'VALUES ($1, $2, $3, $4, $5)', [customerID, customer_QRcode, price, cup_QRcode, currentInsertTime], (error, results) => {
                    if(error) {
                        throw error;
                    }
                    res.status(201).send('Transaction added for for customer QR code: ' + customer_QRcode);
                })
 };

 /* Update an existing transaction with POST */
 exports.transaction_update_post = function(req, res) {
    // Get posted data from request body 
    const customer_QRcode = req.params.id;
    const {
        customerID,
        price,
        cup_QRcode,
        currentInsertTime
     } = req.body;

    pool.query('UPDATE Transactions SET' + 
                'customerID = $1, customer_QRcode = $2, price = $3, cup_QRcode = $4, currentInsertTime = $5', 
                [customerID, customer_QRcode, price, cup_QRcode, currentInsertTime], (error, resulsts) => {
                    if(error) {
                        throw error;
                    }
                    res.status(200).send('Updated transaction with customer QR code: ' + customer_QRcode);
                });
 };

 /* Delete an transaction by parameter "Customer_QRcode" */
 exports.transaction_delete_post = function(req, res) {
    const customer_QRcode = req.params.id;

    pool.query('DELETE FROM Transactions WHERE customer_QRcode = $1', [customer_QRcode], (error, resulsts) => {
        if(error) {
            throw error;
        }
        res.status(200).send('Deleted transactions with customer QR code:' + customer_QRcode);
    })
 };