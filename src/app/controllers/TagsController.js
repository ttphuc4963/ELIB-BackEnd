const config = require('../../config/db/index');
const sql = require('mssql');
const API_URL = require('../../config/constants');
//test
class TagsController {
    //GET /tags
    showAll(req, res, next) {
        const limit = parseInt(req.query.pageCount) || 5;
        const page = parseInt(req.query.page) || 1;
        const offset = (page - 1) * limit;
        sql.connect(config)
            .then((pool) => {
                let getTags = pool
                    .request()
                    .query(
                        'select ID, tagName, status, count(bookISBN) as totalBook from tag left join tagsOfBook on ID = tagID group by ID, tagName, status; select count (*) as total from tag;',
                    );
                // Query
                return getTags;
            })
            .then((result) => {
                const data = {
                    tags: result.recordsets[0],
                    totalTags: result.recordsets[1][0].total,
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
                            : API_URL + `/tags?pageCount=5&page=${page - 1}`,
                    nextPage:
                        page == Math.ceil(result.recordsets[1][0].total / limit)
                            ? null
                            : API_URL + `/tags?pageCount=5&page=${page + 1}`,
                };
                if (data == null) {
                    res.status(404).send({
                        message: 'Không có tag nào được tìm thấy!',
                    });
                } else {
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
    //GET /tags/:id
    show(req, res, next) {
        sql.connect(config)
            .then((pool) => {
                let getTag = pool
                    .request()
                    .input('input_parameter', sql.Int, req.params.id)
                    .query('SELECT * FROM Tag WHERE ID = @input_parameter');
                return getTag;
            })
            .then((result) => {
                const tag = result.recordsets[0][0];
                if (tag == null) {
                    res.status(404).send({
                        message: 'Không có tag nào được tìm thấy!',
                    });
                } else {
                    res.status(200).send(result.recordsets[0]);
                }
            })
            .catch((err) => {
                res.status(503).send({
                    message: 'Không thể kết nối với database',
                });
            });
    }
    //POST /tags/create
    create(req, res, next) {
        sql.connect(config)
            .then((pool) => {
                let tag = { ...req.body };
                let addTag = pool
                    .request()
                    .input('tagName', sql.NVarChar, tag.tagName)
                    .input('note', sql.NVarChar, tag.note)
                    .input('status', sql.NVarChar, tag.status)
                    .query(
                        `INSERT INTO tag (tagName, note, status) values (@tagName, @note, @status)`,
                    );
                return addTag;
            })
            .then((result) => {
                const data = result.recordsets[0];
                res.status(200).send({ message: 'Thêm tag thành công' });
            })
            .catch((err) => {
                console.log(err);
                res.status(503).send({
                    message: 'Không thể kết nối với database',
                });
            });
    }

    //PUT /tags/:id
    update(req, res, next) {
        const tag = { ...req.body };
        sql.connect(config)
            .then((pool) => {
                let updateTag = pool
                    .request()
                    .input('ID', sql.Int, req.params.id)
                    .query(`SELECT * FROM tag WHERE ID = @ID;UPDATE tag 
                    SET 
                    ${tag.tagName ? "tagName = N'" + tag.tagName + "'" : ''}
                    ${tag.tagName && tag.note ? ',' : ''}
                    ${tag.note ? "note = N'" + tag.note + "'" : ''}
                    ${(tag.tagName || tag.note) && tag.status ? ',' : ''}
                    ${tag.status ? "status = '" + tag.status + "'" : ''}

                    WHERE ID = @ID;
                    SELECT * FROM tag WHERE ID = @ID;`);
                return updateTag;
            })
            .then((result) => {
                if (!result.recordsets[0][0]) {
                    res.status(404).send({
                        message: 'Tag không tồn tại!',
                    });
                }
                res.status(200).send({ message: 'Thành công!' });
            })
            .catch((err) => {
                console.log(err);
                res.status(400).send({
                    message: 'Thông tin sai, vui lòng thử lại!',
                });
            });
    }

    //DELETE /tags/:id
    destroy(req, res, next) {
        sql.connect(config)
            .then((pool) => {
                let deleteTag = pool
                    .request()
                    .input('ID', sql.Int, req.params.id)
                    .query(
                        'select * from Tag where ID = @ID; DELETE Tag WHERE ID = @ID; select * from tag where ID = @ID',
                    );
                return deleteTag;
            })
            .then((result) => {
                const tag = result.recordsets[0][0];
                if (tag == null) {
                    res.status(404).send({ message: 'Không tìm thấy tag!' });
                } else {
                    console.log(tag.id);
                    res.status(200).send({ message: 'Thành công!' });
                }
            })
            .catch((err) => {
                res.status(409).send({
                    message: 'Tag đang được sử dụng không xóa được!',
                });
            });
    }
}

module.exports = new TagsController();
