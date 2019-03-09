/**
 * Controller for Transactions
 * Containing CRUD operations for each column
 */

 // Display transactions
 exports.transaction_list = function(req, res) {
    res.send('TODO: transaction list');
 };

 // Show transaction details
 exports.transaction_details = function(req, res) {
     res.send('TODO: transaction detail for ' + req.params.id);
 };

 // Create a new transaction with POST
 exports.transaction_create_post = function(req, res) {
     res.send('TODO: transaction create with post');
 };

 // Update an existing transaction with POST
 exports.transaction_update_post = function(req, res) {
     res.send('TODO: transaction update with post');
 };

 // Delete an transaction by parameter "Customer_QRcode"
 exports.transaction_delete_post = function(req, res) {
    res.send('TODO: transaction delete with post and id');
 };