const config = require('../../config/db/index');
const sql = require('mssql');
const API_URL = require('../../config/constants');

class SearchController {
    search(req, res, next) {
        const limit = parseInt(req.query.pageCount, 10) || 5;
        const page = parseInt(req.query.page, 10) || 1;
        const offset = (page - 1) * limit;
        const type = req.query.type;
        const keyword = req.query.keyword;
        if (type == '' || keyword == '')
            res.status(400).send({
                message: 'Tìm kiếm không phù hợp',
            });
        else {
            if (type.toLowerCase() == 'tag') {
                const query = `SELECT * from (Tag t join tagsOfBook tob on t.ID = tob.tagID) join Book b on b.ISBN = tob.bookISBN where tagName like N'%${keyword}%' order by ISBN OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY;SELECT count(*) as total from (Tag t join tagsOfBook tob on t.ID = tob.tagID) join Book b on b.ISBN = tob.bookISBN where tagName like N'%${keyword}%'`;
                sql.connect(config)
                    .then((pool) => {
                        let books = pool.request().query(query);
                        return books;
                    })
                    .then((result) => {
                        const totalPages = Math.ceil(
                            result.recordsets[1][0].total / limit,
                        );
                        const data = {
                            books: result.recordsets[0],
                            totalBooks: result.recordsets[1][0].total,
                            offset: offset,
                            limit: limit,
                            totalPages,
                            currentPage: page >= totalPages ? totalPages : page,
                            hasPrevPage: page == 1 ? false : true,
                            hasNextPage: page == totalPages ? false : true,
                            prevPage:
                                page == 1
                                    ? null
                                    : API_URL +
                                      `/search?pageCount=${limit}&page=${
                                          page - 1
                                      }`,
                            nextPage:
                                page == totalPages
                                    ? null
                                    : API_URL +
                                      `/search?pageCount=${limit}&page=${
                                          page + 1
                                      }`,
                        };
                        if (result.recordsets[1][0].total === 0) {
                            res.status(404).send({ message: 'Không có sách!' });
                        } else {
                            console.log(data);
                            res.status(200).send(data);
                        }
                    })
                    .catch((err) => {
                        console.log(err);
                        res.status(503).send({
                            message: 'Không thể kết nối với database',
                        });
                    });
            } else {
                const query = `SELECT * from book where ${type} like N'%${keyword}%' order by ISBN OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY;SELECT count(*) as total from book where ${type} like N'%${keyword}%'`;
                sql.connect(config)
                    .then((pool) => {
                        let books = pool.request().query(query);
                        return books;
                    })
                    .then((result) => {
                        const totalPages = Math.ceil(
                            result.recordsets[1][0].total / limit,
                        );
                        const data = {
                            books: result.recordsets[0],
                            totalBooks: result.recordsets[1][0].total,
                            offset: offset,
                            limit: limit,
                            totalPages,
                            currentPage: page >= totalPages ? totalPages : page,
                            hasPrevPage: page == 1 ? false : true,
                            hasNextPage: page == totalPages ? false : true,
                            prevPage:
                                page == 1
                                    ? null
                                    : API_URL +
                                      `/search?pageCount=${limit}&page=${
                                          page - 1
                                      }`,
                            nextPage:
                                page == totalPages
                                    ? null
                                    : API_URL +
                                      `/search?pageCount=${limit}&page=${
                                          page + 1
                                      }`,
                        };
                        if (result.recordsets[1][0].total === 0) {
                            res.status(404).send({ message: 'Không có sách!' });
                        } else {
                            res.status(200).send(data);
                        }
                    })
                    .catch((err) => {
                        res.status(503).send({
                            message: 'Không thể kết nối với database',
                        });
                    });
            }
        }
    }
}

module.exports = new SearchController();
