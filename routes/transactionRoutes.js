var express = require('express');
var router = express.Router();

// Import controller here
var transactionController = require('../controllers/transactionController');

// Routes for transactions

// GET Transactions
router.get('/', transactionController.transaction_list);

// GET Specific transaction
router.get('/get/:id', transactionController.transaction_details);

// POST Create Transaction
router.post('/create', transactionController.transaction_create_post);

// POST Accept transaction
router.post('/accept', transactionController.transaction_accept_post);

// POST machine accept
router.post('/machine_accept', transactionController.transaction_machine_accept);

// POST hashbuilder
router.post('/jsum', transactionController.transaction_generate_hash);

module.exports = router;