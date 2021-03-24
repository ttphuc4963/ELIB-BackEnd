const booksRouter = require('./books');
const tagsRouter = require('./tags');
const readersRouter = require('./readers');
const searchRouter = require('./search');

function route(app) {
    app.use('/books', booksRouter);
    app.use('/tags', tagsRouter);
    app.use('/search', searchRouter);
    app.use('/readers', readersRouter);
}

module.exports = route;
