const express = require('express');
const cors = require('cors');
// const morgan = require("morgan");
const path = require('path');
require('express-async-errors');

const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000;
const route = require('./routes/index');

const Book = require('./app/models/book');
const booksController = require('./app/controllers/BooksController');

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

//HTTP logger
// app.use(morgan('combined'));

// booksController.getBooks().then(result =>{
//     console.log(result);
// })

route(app);

app.use((req, res, next) => {
    res.status(404).send({
        message: 'Không tồn tại tài nguyên!',
    });
});

app.use((err, req, res, next) => {
    console.log(err.stack);
    res.status(500).send({
        message: 'Có gì đó không đúng!',
    });
});

app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});
