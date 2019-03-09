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

// POST Update Transaction
router.post('/update/:id', transactionController.transaction_update_post);

module.exports = router;