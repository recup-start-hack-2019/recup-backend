const express = require('express');
const app = express();

const dotenv = require('dotenv');
var result = dotenv.config();
if(result.error) {
    throw result.error;
}

// Set port
const port = process.env.PORT;

// Init body-parser
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));


// Simple index
app.get('/', (req, res) => {
    res.send('Peace. This is the ReCup backend.');
});

// Import routers
var transactionRouter = require('./routes/transactionRoutes');
app.use('/transactions', transactionRouter);

app.listen(port);
console.log("ReCup backend server started on port " + port);