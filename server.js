const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Simple index
app.get('/', (req, res) => {
    res.send('Peace. This is the ReCup backend.');
});

// Import routers
var transactionRouter = require('./routes/transactionRoutes');
app.use('/transactions', transactionRouter);

app.listen(port);
console.log("ReCup backend server started on port " + port);