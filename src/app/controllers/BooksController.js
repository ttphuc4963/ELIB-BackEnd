const config = require('../../config/db/index');
const sql = require('mssql');
const Book = require('../models/book');
const API_URL = require('../../config/constants');
const { request } = require('express');
const xlsx = require('xlsx');

class BooksController {
    //GET /books/:isbn
    show(req, res, next) {
        sql.connect(config)
            .then((pool) => {
                let getBook = pool
                    .request()
                    .input('input_parameter', sql.VarChar, req.params.isbn)
                    .query(
                        'SELECT * FROM Book WHERE ISBN = @input_parameter; ' +
                            'SELECT a.tagName FROM tag a, tagsOfBook b WHERE a.ID = b.tagID and b.bookISBN = @input_parameter;' +
                            'select top(5) * from book b join tagsofbook tob on b.ISBN = tob.bookISBN join tag t on tob.tagID = t.ID where tagname in (select tagName from book b join tagsofbook tob on b.ISBN = tob.bookISBN join tag t on tob.tagID = t.ID where ISBN = @input_parameter) and (ISBN != @input_parameter);' +
                            'select top(5) uniID, email, fullName from returnedbook rb join bookcopies bc on rb.bookcopyid = bc.id join reader r on rb.readeruniid = r.uniid where ISBN = @input_parameter order by starttime;' +
                            'select top(5) uniID, email, fullName from borrowedbook bb join bookcopies bc on bb.bookcopyid = bc.id join reader r on bb.readeruniid = r.uniid where ISBN = @input_parameter order by starttime;',
                    );
                return getBook;
            })
            .then((result) => {
                const bookInfo = result.recordsets[0][0];

                const bookInfoTags = result.recordsets[1];
                const relatedBook = result.recordsets[2];
                const relatedUser1 = result.recordsets[3];
                const recentBorrower = result.recordsets[4];
                if (recentBorrower == null) recentBorrower = relatedUser1;
                if (bookInfo == null) {
                    res.status(404).send({
                        message: 'Không tìm thấy sách tương ứng!',
                    });
                } else {
                    res.status(200).json({
                        bookInfo,
                        bookInfoTags,
                        relatedBook,
                        recentBorrower,
                    });
                }
            })
            .catch((err) => {
                console.log(err);
                res.status(503).send({
                    message: 'Không thể kết nối với database',
                });
            });
    }

    //GET /books
    showAll(req, res, next) {
        const limit = parseInt(req.query.pageCount) || 5;
        const page = parseInt(req.query.page) || 1;
        const offset = (page - 1) * limit;
        sql.connect(config)
            .then((pool) => {
                let getBooks = pool
                    .request()
                    .query(
                        `SELECT * FROM Book order by ISBN OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY; select count(*) as total from book;`,
                    );
                return getBooks;
            })
            .then((result) => {
                const data = {
                    books: result.recordsets[0],
                    totalBooks: result.recordsets[1][0].total,
                    offset: offset,
                    limit: limit,
                    totalPage: Math.ceil(result.recordsets[1][0].total / limit),
                    currentPage: page,
                    hasPrevPage: page == 1 ? false : true,
                    hasNextPage:
                        page == Math.ceil(result.recordsets[1][0].total / limit)
                            ? false
                            : true,
                    prevPage:
                        page == 1
                            ? null
                            : API_URL +
                              `/books?pageCount=${limit}&page=${page - 1}`,
                    nextPage:
                        page == Math.ceil(result.recordsets[1][0].total / limit)
                            ? null
                            : API_URL +
                              `/books?pageCount=${limit}&page=${page + 1}`,
                };
                res.status(200).send(data);
            })
            .catch((err) => {
                res.status(503).send({
                    message: 'Không thể kết nối với database',
                });
            });
    }

    //Get books by Tag ID /books/byTag/:id
    getBookByTags(req, res, next) {
        const limit = parseInt(req.query.pageCount) || 5;
        const page = parseInt(req.query.page) || 1;
        const offset = (page - 1) * limit;
        sql.connect(config)
            .then((pool) => {
                let books = pool
                    .request()
                    .input('tagID', sql.Int, req.params.id)
                    .query(
                        `SELECT * from (Tag t join tagsOfBook tob on t.ID = tob.tagID) join Book b on b.ISBN = tob.bookISBN where tagID = @tagID order by ISBN OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY;SELECT count(*) as total from (Tag t join tagsOfBook tob on t.ID = tob.tagID) join Book b on b.ISBN = tob.bookISBN where tagID = @tagID`,
                    );
                return books;
            })
            .then((result) => {
                const data = {
                    books: result.recordsets[0],
                    totalBooks: result.recordsets[1][0].total,
                    offset: offset,
                    limit: limit,
                    totalPage: Math.ceil(result.recordsets[1][0].total / limit),
                    currentPage: page,
                    hasPrevPage: page == 1 ? false : true,
                    hasNextPage:
                        page == Math.ceil(result.recordsets[1][0].total / limit)
                            ? false
                            : true,
                    prevPage:
                        page == 1
                            ? null
                            : API_URL +
                              `/books/byTag/${
                                  req.params.id
                              }?pageCount=${limit}&page=${page - 1}`,
                    nextPage:
                        page == Math.ceil(result.recordsets[1][0].total / limit)
                            ? null
                            : API_URL +
                              `/books/byTag/${
                                  req.params.id
                              }?pageCount=${limit}&page=${page + 1}`,
                };
                if (data == null) {
                    res.status(404).send({ message: 'Không có sách!' });
                } else {
                    res.status(200).send(data);
                }
            })
            .catch((err) => {
                res.status(503).send({
                    message: 'Không thể kết nối với database!',
                });
            });
    }

    //GET /books/:id/suggestedBuying
    suggestedBuying(req, res, next) {
        sql.connect(config)
            .then((pool) => {
                let getBooks = pool
                    .request()
                    .query('SELECT * FROM suggestedBuying');
                // Query
                return getBooks;
            })
            .then((result) => {
                res.status(200).send(result.recordsets[0]);
            })
            .catch((err) => {
                res.status(503).send({
                    message: 'Không thể kết nối với database',
                });
            });
    }

    //GET /books/:isbn/tags
    /*showTags(req, res, next) {
        sql.connect(config)
            .then((pool) => {
                let getTags = pool
                    .request()
                    .input('input_parameter', sql.VarChar, req.params.id)
                    .query(
                        'SELECT * FROM TagsOfBook WHERE BookISBN = @input_parameter',
                    );
                return getTags;
            })
            .then((result) => {
                const tag = result.recordsets[0];
                if (tag == null) {
                    res.status(404).send({ message: 'Không tìm thấy tag!' });
                } else {
                    res.status(200).send({ message: 'Thành công!' }, tag);
                }
            })
            .catch((err) => {
                console.log(err);
                res.status(503).send({
                    message: 'Không thể kết nối với database!',
                });
            });
    }
*/
    //POST /books/
    importByCsv(req, res, next) {
        var workbook = xlsx.readFile('../../../~$LibraryPL.xlsx');
        var sheet_name_list = workbook.SheetNames;
        var xlData = xlsx.utils.sheet_to_json(
            workbook.Sheets[sheet_name_list[0]],
        );
        res.send(xlData);
    }
    //POST /books/
    store(req, res, next) {
        const book = { ...req.body };
        const validISBN = book.ISBN.replace(/\s+/g, '');
        if (validISBN.length != 13) {
            res.status(400).send({
                message: 'ISBN không hợp lệ!',
            });
        }
        sql.connect(config)
            .then((pool) => {
                let check = pool
                    .request()
                    .input('ISBN', sql.VarChar, validISBN)
                    .query('SELECT * FROM Book WHERE ISBN = @ISBN');
                return check;
            })
            .then((result) => {
                if (result.recordsets[0][0]) {
                    res.status(409).send({
                        message: 'Sách đã tồn tại!',
                    });
                } else {
                    sql.connect(config)
                        .then((pool) => {
                            let addBook = pool
                                .request()
                                .input('ISBN', sql.VarChar, validISBN)
                                .input('bookName', sql.NVarChar, book.bookName)
                                .input('author', sql.NVarChar, book.author)
                                .input(
                                    'publisher',
                                    sql.NVarChar,
                                    book.publisher,
                                )
                                .input('publishYear', sql.Int, book.publishYear)
                                .input('edition', sql.Int, book.edition)
                                .input('language', sql.NVarChar, book.language)
                                .input(
                                    'description',
                                    sql.Text,
                                    book.description,
                                )
                                .input(
                                    'previewContent',
                                    sql.Text,
                                    book.previewContent,
                                )
                                .input('coverImg', sql.VarChar, book.coverImg)
                                .input(
                                    'numberOfPages',
                                    sql.Int,
                                    book.numberOfPages,
                                )
                                .query(
                                    `INSERT INTO Book (ISBN, bookName, author, publisher, publishYear, edition, language, description, previewContent, coverImg, numberOfPages, total) values (@ISBN, @bookName, @author, @publisher, @publishYear, @edition, @language, @description, @previewContent, @coverImg, @numberOfPages, 0);
                                SELECT * FROM Book WHERE ISBN = @ISBN;`,
                                );
                            return addBook;
                        })
                        .then((result) => {
                            if (result.recordsets[0][0]) {
                                res.status(200).send(result.recordsets[0][0]);
                            }
                        });
                }
            })
            .catch((err) => {
                res.status(503).send({
                    message: 'Không thể kết nối với database!',
                });
            });
    }

    showBookCopies(req, res, next) {
        sql.connect(config)
            .then((pool) => {
                let bookCopies = pool
                    .request()
                    .input('input_parameter', sql.VarChar, req.params.isbn)
                    .query(`SELECT * FROM bookCopies WHERE ISBN = @input_parameter;
                    SELECT total FROM BOOK WHERE ISBN = @input_parameter`);
                return bookCopies;
            })
            .then((result) => {
                const book = result.recordsets[0][0];
                if (book == null) {
                    res.status(404).send({
                        message: 'Không có copy nào của sách!',
                    });
                } else {
                    const data = {
                        bookCopies: result.recordsets[0],
                        total: result.recordsets[1][0],
                    };
                    res.status(200).send(data);
                }
            })
            .catch((err) => {
                console.log(err);
                res.status(503).send({
                    message: 'Không thể kết nối với database',
                });
            });
    }

    //POST /books/:isbn/storeBookCopy
    storeBookCopy(req, res, next) {
        const book = { ...req.body };
        sql.connect(config)
            .then((pool) => {
                let BookCopy = pool
                    .request()
                    .input('ISBN', sql.VarChar, req.params.isbn)
                    .query(`SELECT COUNT(ISBN) as totalBook  FROM bookCopies; 
                    SELECT ISBN, edition FROM book WHERE ISBN = @ISBN;
                    SELECT COUNT(ISBN) as totalCopies FROM bookCopies WHERE ISBN = @ISBN;
                    SELECT ID FROM bookCopies WHERE ISBN = @ISBN;`);
                return BookCopy;
            })
            .then((result) => {
                var totalBook = result.recordsets[0][0].totalBook;
                var edition, totalCopies;
                if (!result.recordsets[1][0]) {
                    res.status(404).send({
                        message: 'ISBN không tồn tại!',
                    });
                } else {
                    edition = result.recordsets[1][0].edition;
                    totalCopies = result.recordsets[2][0].totalCopies;
                    if (totalCopies > 0) {
                        var copyID = result.recordsets[3][0].ID;
                        totalBook = copyID.substring(0, copyID.search('_'));
                    } else totalBook++;
                }
                const genID = `${totalBook}_${edition}_${totalCopies + 1}`;
                console.log(genID);
                sql.connect(config)
                    .then((pool) => {
                        let BookCopy = pool
                            .request()
                            .input('ID', sql.NVarChar, genID)
                            .input('ISBN', sql.VarChar, req.params.isbn)
                            .input('numberOfCDs', sql.Int, book.numberOfCDs)
                            .input('status', sql.NVarChar, book.status)
                            .input(
                                'bookStateDescription',
                                sql.NVarChar,
                                book.bookStateDescription,
                            )
                            .query(`INSERT INTO bookCopies (ID, ISBN, numberOfCDs, status, bookStateDescription) VALUES (@ID, @ISBN, @numberOfCDs, @status, @bookStateDescription);
                    SELECT * FROM bookCopies WHERE ID=@ID`);
                        return BookCopy;
                    })
                    .then((result) => {
                        if (result.recordsets[0]) {
                            res.status(201).send(result.recordsets[0][0]);
                        }
                    })
                    .catch((err) => {
                        res.status(400).send({
                            message: 'Thông tin sai vui lòng thử lại',
                        });
                        console.log(err);
                    });
            })
            .catch((err) => {
                res.status(400).send({
                    message: 'Thông tin sai vui lòng thử lại',
                });
                console.log(err);
            });
    }

    //POST /books/:isbn/addTag/:tagID
    addTag(req, res, next) {
        sql.connect(config)
            .then((pool) => {
                let book = { ...req.body };
                let addTagBook = pool
                    .request()
                    .input('bookISBN', sql.VarChar, req.params.isbn)
                    .input('tagID', sql.VarChar, req.params.tagID)
                    .query(
                        'INSERT INTO tagsOfBook (bookISBN, tagID) values (@bookISBN, @tagID)',
                    );
                return addTagBook;
            })
            .then((result) => {
                res.status(201).send({
                    message: 'Thêm Tag cho sách thành công',
                });
            })
            .catch((err) => {
                res.status(409).send({ message: 'Sách đã có tag này rồi!' });
            });
    }

    //PUT /books/:isbn
    update(req, res, next) {
        const book = { ...req.body };
        sql.connect(config)
            .then((pool) => {
                let updateBook = pool
                    .request()
                    .input('ISBN', sql.VarChar, req.params.isbn)
                    .query(`select * from book where ISBN = @ISBN;`);
                return updateBook;
            })
            .then((result) => {
                const checkBook = result.recordsets[0][0];
                if (checkBook == null) {
                    res.status(404).send({ message: 'Sách không tồn tại!' });
                } else {
                    if (book.bookName == null)
                        book.bookName = checkBook.bookName;
                    if (book.author == null) book.author = checkBook.author;
                    if (book.publisher == null)
                        book.publisher = checkBook.publisher;
                    if (book.publishYear == null)
                        book.publishYear = checkBook.publishYear;
                    if (book.edition == null) book.edition = checkBook.edition;
                    if (book.language == null)
                        book.language = checkBook.language;
                    if (book.previewContent == null)
                        book.previewContent = checkBook.previewContent;
                    if (book.description == null)
                        book.description = checkBook.description;
                    if (book.coverImg == null)
                        book.coverImg = checkBook.coverImg;
                    if (book.numberOfPages == null)
                        book.numberOfPages = checkBook.numberOfPages;
                    sql.connect(config)
                        .then((pool) => {
                            let updateBook = pool
                                .request()
                                .input('ISBN', sql.VarChar, req.params.isbn)
                                .query(
                                    `update book set bookName = N'${book.bookName}', author = N'${book.author}', publisher = N'${book.publisher}', publishYear = ${book.publishYear}, edition = ${book.edition}, previewContent = N'${book.previewContent}', description = N'${book.description}', coverImg = '${book.coverImg}', numberOfPages = ${book.numberOfPages}, language = N'${book.language}' where ISBN = @ISBN;`,
                                );
                            return updateBook;
                        })
                        .then((result) => {
                            res.status(200).send({
                                message: 'Thành công!',
                                book,
                            });
                        })
                        .catch((err) => {
                            console.log(err);
                            res.status(400).send({
                                message: 'Thông tin sai, vui lòng thử lại!',
                            });
                        });
                }
            })
            .catch((err) => {
                console.log(err);
                res.status(400).send({
                    message: 'Thông tin sai, vui lòng thử lại!',
                });
            });
    }

    //DELETE /books/:isbn
    destroy(req, res, next) {
        sql.connect(config)
            .then((pool) => {
                let deleteBook = pool
                    .request()
                    .input('isbn', sql.VarChar, req.params.isbn)
                    .query(
                        'select * from Book WHERE isbn = @isbn; DELETE from Book WHERE isbn = @isbn;select * from Book WHERE isbn = @isbn',
                    );
                return deleteBook;
            })
            .then((result) => {
                const bookDel = result.recordsets[0][0];
                if (bookDel == null) {
                    res.status(404).send({ message: 'Không tìm thấy sách !' });
                } else {
                    res.status(200).send({ message: 'Thành công!' });
                }
            })
            .catch((err) => {
                res.status(409).send({
                    message: 'Không thể xóa do sách đang được tham chiếu',
                });
            });
    }
}

module.exports = new BooksController();
