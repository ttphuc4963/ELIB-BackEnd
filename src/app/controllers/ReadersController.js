require('dotenv').config();
const config = require('../../config/db/index');
const sql = require('mssql');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const e = require('express');
const moment = require('moment');
moment().format();
const date = require('date-and-time');
const { updateRefreshToken } = require('./AuthController');
const API_URL = require('../../config/constants');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { read } = require('fs');

const getUser = async (uniID) => {
    await sql.connect(config);
    const result = await sql.query`select * from reader where uniID = ${uniID}`;
    if (result.recordset.length !== 0) {
        return result.recordset[0];
    }
    return null;
};
//hello
class ReadersController {
    //GET /readers/:id
    show(req, res, next) {
        sql.connect(config)
            .then((pool) => {
                let getUser = pool
                    .request()
                    .input('input_parameter', sql.VarChar, req.params.id)
                    .query(
                        'SELECT * FROM Reader WHERE uniID = @input_parameter',
                    );
                return getUser;
            })
            .then((result) => {
                const userInfo = result.recordsets[0][0];
                delete userInfo.password;
                delete userInfo.refreshToken;
                res.send(userInfo);
            })
            .catch((err) => {
                res.status(400).send({ message: 'Cant not find reader' });
            });
    }
    //GET /readers/me
    /*
        x-access-token
        jwt.
        {
            "user": {"uniID": 1753082},
            "iat": time created,
            "exp": time expired
        }
    */
    showMe(req, res, next) {
        sql.connect(config)
            .then((pool) => {
                let getUser = pool
                    .request()
                    .input(
                        'input_parameter',
                        sql.VarChar,
                        req.jwtDecoded.user.uniID,
                    )
                    .query(
                        'SELECT * FROM Reader WHERE uniID = @input_parameter',
                    );
                return getUser;
            })
            .then((result) => {
                const userInfo = result.recordsets[0][0];
                delete userInfo.password;
                delete userInfo.refreshToken;
                res.send(userInfo);
            })
            .catch((err) => {
                res.status(400).send({ message: 'Cant not find reader' });
            });
    }

    //GET /readers
    showAll(req, res, next) {
        const limit = parseInt(req.query.pageCount) || 5;
        const page = parseInt(req.query.page) || 1;
        const offset = (page - 1) * limit;
        sql.connect(config)
            .then((pool) => {
                let getReaders = pool
                    .request()
                    .query(
                        `SELECT uniID, email, type, fullName, phoneNumber, note, profileImg, status, createdTime, updatedTime FROM Reader order by uniID OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY; select count(*) as total from reader`,
                    );
                // Query
                return getReaders;
            })
            .then((result) => {
                const data = {
                    readers: result.recordsets[0],
                    totalReaders: result.recordsets[1][0].total,
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
                              `/readers?pageCount=${limit}&page=${page - 1}`,
                    nextPage:
                        page == Math.ceil(result.recordsets[1][0].total / limit)
                            ? null
                            : API_URL +
                              `/readers?pageCount=${limit}&page=${page + 1}`,
                };
                res.send(data);
            })
            .catch((err) => {
                res.status(500).send({
                    message: 'Không kết nối được với database',
                });
            });
    }

    //POST /readers/register
    async register(req, res, next) {
        try {
            let user = { ...req.body };
            if (
                !user.uniID ||
                !user.password ||
                !user.email ||
                !user.fullName ||
                !user.phoneNumber ||
                user.phoneNumber.length != 10 ||
                isNaN(user.phoneNumber)
            )
                throw 'Thông tin sai, vui lòng thử lại!';
            const email = user.email;
            var type = email.substring(email.search('@') + 1, email.length);
            console.log(type);
            if (type == 'fit.hcmus.edu.vn') {
                type = 'Lecturer';
            } else if (type == 'student.hcmus.edu.vn' || type == 'apcs.vn') {
                type = 'Student';
            } else {
                throw 'Email không hợp lệ!';
            }
            console.log(type);
            // user.type.toLowerCase() == 'admin'
            //     throw 'Không cho phép tạo tài khoản admin!';
            sql.connect(config)
                .then(async (pool) => {
                    const salt = await bcrypt.genSalt();
                    const hashedPassword = await bcrypt.hash(
                        user.password,
                        salt,
                    );
                    let createUser = pool
                        .request()
                        .input('uniID', sql.VarChar, user.uniID)
                        .input('password', sql.VarChar, hashedPassword)
                        .input('type', sql.NVarChar, type)
                        .input('email', sql.VarChar, user.email)
                        .input('fullName', sql.NVarChar, user.fullName)
                        .input('phoneNumber', sql.NVarChar, user.phoneNumber)
                        .query(
                            `INSERT INTO Reader (uniID, password, type, status, note, profileImg, email, fullName, phoneNumber ) values (@uniID, @password, @type, 'Disable', 'Nothing', 'https://i.ibb.co/6yYxjmk/146953764-176620033853196-4165264106632485700-n.jpg', @email, @fullName, @phoneNumber); INSERT INTO 
                                ${type} 
                                 (uniID) values (@uniID); select uniID, type, email, fullName, phoneNumber from reader where uniID = @uniID;`,
                        );
                    delete createUser.password;
                    return createUser;
                })
                .then((result) => {
                    const reader = result.recordsets[0][0];
                    res.send(reader);
                    const emailToken = crypto.randomBytes(64).toString('hex');
                    let transporter = nodemailer.createTransport({
                        service: 'gmail',
                        auth: {
                            user: 'quangphu.datn@gmail.com',
                            pass: 'A@a123456',
                        },
                    });
                    let mailOptions = {
                        from: 'quangphu.datn@gmail.com',
                        to: `${reader.email}`,
                        subject: `Verifying your Reader Account's Email`,
                        text: `
                        Xin chào, cảm ơn bạn đã đăng ký sử dụng hệ thống thư viện của khoa.
                        Để bảo vệ thông tin của bạn, vui lòng xác nhận địa chỉ email. Sau đó bạn có thể sử dụng các dịch vụ của hệ thống.
                        `,
                        html: `
                        <h1>Xin chào!</h1>
                        <p>Cảm ơn bạn đã đăng ký sử dụng hệ thống thư viện của khoa.</p>
                        <p>Để bảo vệ thông tin của bạn, vui lòng xác nhận địa chỉ email. Sau đó bạn có thể sử dụng các dịch vụ của hệ thống.</p>
                        <a style="color: #ffffff; text-decoration: none; padding: 15px 25px; border-radius: 2px; border: 1px solid #FFA73B; background-color: #FFA73B; display: inline-block;" href="http://${req.headers.host}/readers/${reader.uniID}/verify-email?token=${emailToken}" >Xác nhận ngay</a>
                        <h5>Nút xác nhận không hoạt động?</h5>
                        <h5>Bạn có thể sao chép liên kết sau và dán vào trình duyệt:</h5>
                        <p>http://${req.headers.host}/readers/${reader.uniID}/verify-email?token=${emailToken}</p>

                        `,
                    };
                    transporter.sendMail(mailOptions, function (err, data) {
                        if (err) console.log(err);
                        else console.log('email sent');
                    });
                })
                .catch((err) => {
                    console.log(err);
                    res.status(409).send({
                        message: 'Đã tồn tại email hoặc MSSV/MSCB đã tồn tại',
                    });
                });
        } catch (err) {
            console.log(err);
            res.status(400).send({ message: err });
        }
    }

    verifyEmail(req, res, next) {
        sql.connect(config)
            .then((pool) => {
                let verifyEmail = pool
                    .request()
                    .input('uniID', sql.VarChar, req.params.uniID)
                    .query(
                        `Update reader set status = 'Enable' where uniID = @uniID; select * from reader where uniID = @uniID and status = 'Enable'`,
                    );
                return verifyEmail;
            })
            .then((result) => {
                const check = result.recordsets[0][0];
                if (check == null) {
                    res.status(404).send({
                        message: 'Không tìm thấy người dùng!',
                    });
                } else {
                    res.redirect('https://elib.vercel.app/sign-in');
                }
            })
            .catch((err) => {
                console.log(err);
                res.status(409).send({
                    message:
                        'Người dùng đang mượn sách/đặt lịch không xóa được!',
                });
            });
    }

    //PUT /readers/me
    /*
        chỉ cho phép người dùng thay đổi tên, số điện thoại, ảnh đại diện
        với Password, dùng endpoint khác  
    */
    async update(req, res, next) {
        const user = { ...req.body };
        sql.connect(config)
            .then(async (pool) => {
                let updateUser = await pool
                    .request()
                    .input('uniID', sql.VarChar, req.jwtDecoded.user.uniID)
                    .query(`UPDATE reader
                    SET 
                    ${
                        user.profileImg
                            ? "profileImg = '" + user.profileImg + "'"
                            : ''
                    } 
                    ${user.profileImg && user.fullName ? ',' : ''} 
                    ${
                        user.fullName
                            ? "fullName = N'" + user.fullName + "'"
                            : ''
                    } 
                    ${user.phoneNumber && user.fullName ? ',' : ''}
                    ${
                        user.phoneNumber
                            ? "phoneNumber = '" + user.phoneNumber + "'"
                            : ''
                    } 
                    WHERE uniID = @uniID; select * from reader where uniID = @uniID`);
                return updateUser;
            })
            .then((result) => {
                const info = result.recordsets[0][0];
                delete info.password;
                delete info.type;
                delete info.status;
                delete info.refreshToken;
                res.status(200).send({ info });
            })
            .catch((err) => {
                console.log(err);
                res.status(400).send({
                    message: 'Thông tin sai, vui lòng thử lại!',
                });
            });
    }

    async updateAdmin(req, res, next) {
        const user = { ...req.body };
        sql.connect(config)
            .then(async (pool) => {
                let updateUser = await pool
                    .request()
                    .input('uniID', sql.VarChar, req.params.id)
                    .query(`select * from reader where uniID = @uniID; UPDATE reader
                    SET 
                    ${
                        user.profileImg
                            ? "profileImg = '" + user.profileImg + "'"
                            : ''
                    } 
                    ${user.profileImg && user.fullName ? ',' : ''} 
                    ${
                        user.fullName
                            ? "fullName = N'" + user.fullName + "'"
                            : ''
                    } 
                    ${user.phoneNumber && user.fullName ? ',' : ''}
                    ${
                        user.phoneNumber
                            ? "phoneNumber = '" + user.phoneNumber + "'"
                            : ''
                    }
                    ${user.note && user.fullName ? ',' : ''}
                    ${user.note ? "note = N'" + user.note + "'" : ''} 
                    ${user.status && user.note ? ',' : ''}
                    ${user.status ? "status = '" + user.status + "'" : ''} 
                    WHERE uniID = @uniID; select * from reader where uniID = @uniID`);
                return updateUser;
            })
            .then((result) => {
                const checkReader = result.recordset[0];
                const info = result.recordsets[1][0];
                delete info.password;
                delete info.type;
                delete info.status;
                delete info.refreshToken;
                if (checkReader == null) {
                    res.status(404).send({
                        message: 'Không tìm thấy người dùng',
                    });
                } else {
                    res.status(200).send({ info });
                }
            })
            .catch((err) => {
                console.log(err);
                res.status(400).send({
                    message: 'Thông tin sai, vui lòng thử lại!',
                });
            });
    }

    //POST /readers/:id/change-password
    async changePassword(req, res, next) {
        try {
            if (!req.body.newPassword || !req.body.password)
                throw 'Thông tin không hợp lệ!';

            const user = await getUser(req.jwtDecoded.user.uniID);
            console.log(user);
            if (user === null) throw 'Người dùng không tồn tại';
            if (await bcrypt.compare(req.body.password, user.password)) {
                const salt = await bcrypt.genSalt();
                const hashedPassword = await bcrypt.hash(
                    req.body.newPassword,
                    salt,
                );
                sql.connect(config)
                    .then(async (pool) => {
                        let updateUser = await pool
                            .request()
                            .input('uniID', sql.VarChar, user.uniID)
                            .input('newPassword', sql.VarChar, hashedPassword)
                            .query(`UPDATE reader
                            SET password = @newPassword
                            WHERE uniID = @uniID`);

                        return updateUser;
                    })
                    .then(async (result) => {
                        await updateRefreshToken(req.jwtDecoded.user.uniID, '');
                        res.status(200).send({
                            message: 'Thành công',
                        });
                    })
                    .catch((err) => {
                        console.log(err);
                        res.status(400).send({
                            message: 'Thông tin sai, vui lòng thử lại!',
                        });
                    });
            } else {
                res.status(400).send({ message: 'Sai mật khẩu!' });
            }
        } catch (err) {
            console.log(err);
            res.status(400).send({ message: err });
        }
    }

    //DELETE /readers/:id
    destroy(req, res, next) {
        sql.connect(config)
            .then((pool) => {
                let deleteUser = pool
                    .request()
                    .input('uniID', sql.VarChar, req.params.id)
                    .query(
                        'select * from reader where uniID = @uniID ;DELETE from lecturer where uniID = @uniID;DELETE from student where uniID = @uniID;DELETE from Reader WHERE uniID = @uniID',
                    );
                return deleteUser;
            })
            .then((result) => {
                const tag = result.recordsets[0][0];
                if (tag == null) {
                    res.status(404).send({
                        message: 'Không tìm thấy người dùng!',
                    });
                } else {
                    res.status(200).send({ message: 'Thành công!' });
                }
            })
            .catch((err) => {
                res.status(409).send({
                    message:
                        'Người dùng đang mượn sách/đặt lịch không xóa được!',
                });
            });
    }

    //GET /readers/:id/borrowedBooks
    borrowedBooks(req, res, next) {
        sql.connect(config)
            .then((pool) => {
                let BorrowedBooks = pool
                    .request()
                    .input('input_parameter', sql.Int, req.params.id)
                    .query(
                        'SELECT * FROM BorrowedBook WHERE ReaderID = @input_parameter',
                    );
                return BorrowedBooks;
            })
            .then((result) => {
                res.send(result.recordsets[0]);
            })
            .catch((err) => {
                console.log(err);
            });
    }

    //GET /readers/:id/returnedBooks
    returnedBooks(req, res, next) {
        sql.connect(config)
            .then((pool) => {
                let returnedBooks = pool
                    .request()
                    .input('input_parameter', sql.Int, req.params.id)
                    .query(
                        'SELECT * FROM ReturnedBook WHERE LendedID = @input_parameter',
                    );
                return returnedBooks;
            })
            .then((result) => {
                res.send(result.recordsets[0]);
            })
            .catch((err) => {
                console.log(err);
            });
    }

    //POST /readers/borrowingSchedule/:bookISBN
    async borrowingSchedule(req, res, next) {
        const checkDate = date.isValid(req.body.scheduledDate, 'DD/MM/YYYY');
        if (!checkDate) {
            res.status(400).send({
                message:
                    'Ngày không hợp lệ, ngày hợp lệ theo định dạng DD/MM/YYYY!',
            });
        }
        sql.connect(config)
            .then((pool) => {
                let countBorrowed = pool
                    .request()
                    .input(
                        'readerUniID',
                        sql.VarChar,
                        req.jwtDecoded.user.uniID,
                    )
                    .input('bookISBN', sql.VarChar, req.params.bookISBN)
                    .query(
                        `SELECT COUNT(readerUniID) as  BorrowedBooks FROM borrowedBook WHERE readerUniID = @readerUniID; 
                            SELECT COUNT(readerUniID) as  BorrowedBooks FROM borrowingSchedule WHERE readerUniID = @readerUniID; 
                             SELECT total FROM book WHERE ISBN = @bookISBN; 
                             SELECT * FROM borrowingSchedule WHERE readerUniID = @readerUniID AND bookISBN = @bookISBN `,
                    );
                return countBorrowed;
            })
            .then((result) => {
                const borrowedBooks =
                    result.recordsets[0][0].BorrowedBooks +
                    result.recordsets[1][0].BorrowedBooks;
                if (!result.recordsets[2][0]) {
                    res.status(400).send({
                        message: 'ISBN không tồn tại!',
                    });
                } else if (result.recordsets[2][0].total == 0) {
                    res.status(405).send({
                        message: 'Sách đã được mượn hết!',
                    });
                } else if (borrowedBooks >= 2) {
                    res.status(406).send({
                        message: 'Đã mượn quá số lượng sách được quy định!',
                    });
                } else if (result.recordsets[3][0]) {
                    res.status(409).send({
                        message: 'Bạn đã mượn sách này rồi',
                    });
                } else if (result.recordsets[0][0].BorrowedBooks < 2) {
                    sql.connect(config)
                        .then((pool) => {
                            let borrowingSchedule = pool
                                .request()
                                .input(
                                    'readerUniID',
                                    sql.VarChar,
                                    req.jwtDecoded.user.uniID,
                                )
                                .input(
                                    'bookISBN',
                                    sql.VarChar,
                                    req.params.bookISBN,
                                )
                                // .input(
                                //     'scheduledDate',
                                //     sql.Date,
                                //     req.body.scheduledDate,
                                // )
                                .query(
                                    `INSERT INTO borrowingSchedule (readerUniID, bookISBN, scheduledDate, status) VALUES (@readerUniID, @bookISBN, CONVERT(date, '${req.body.scheduledDate}', 105), 0); SELECT * FROM borrowingSchedule WHERE readerUniID = @readerUniID AND bookISBN = @bookISBN`,
                                );
                            return borrowingSchedule;
                        })
                        .then((result) => {
                            res.status(201).send(result.recordsets[0][0]);
                        })
                        .catch((err) => {
                            console.log(err);
                            res.send(err);
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

    //POST /readers/:id/borrowBook/bookID
    borrowBook(req, res, next) {
        sql.connect(config)
            .then((pool) => {
                let book = { ...req.body };
                let borrowBook = pool
                    .request()
                    .input('StartTime', sql.Date, book.StartTime)
                    .input('EndTime', sql.Date, book.EndTime)
                    .input('ExtendedDate', sql.Date, book.ExtendedDate)
                    .input('BookID', sql.Int, req.params.bookID)
                    .input('ReaderID', sql.Int, req.params.id)
                    .query(
                        'INSERT INTO BorrowedBook (StartTime, EndTime, ExtendedDate, BookID, ReaderID) values (@StartTime, @EndTime, @ExtendedDate, @BookID, @ReaderID)',
                    );
                return borrowBook;
            })
            .then((result) => {
                res.send(result.recordsets[0]);
            })
            .catch((err) => {
                console.log(err);
                res.send(err);
            });
    }

    //POST /readers/:id/borrowBook/bookID
    returnBook(req, res, next) {
        sql.connect(config)
            .then((pool) => {
                let book = { ...req.body };
                let returnBooks = pool
                    .request()
                    .input('ReturnTime', sql.Date, book.StartTime)
                    .input('State', sql.NVarChar, book.EndTime)
                    .input('Fee', sql.Int, book.ExtendedDate)
                    .input('BookID', sql.Int, book.BookID)
                    .input('ReaderID', sql.Int, book.ReaderID)
                    .input('LendedID', sql.Int, req.params.id)
                    .query(
                        'INSERT INTO ReturnedBook (ReturnTime, State, Fee, BookID, ReaderID, LendedID ) values (@ReturnTime, @State, @Fee, @BookID, @ReaderID, @LendedID)',
                    );
                return returnBooks;
            })
            .then((result) => {
                res.send(result.recordsets[0]);
            })
            .catch((err) => {
                console.log(err);
            });
    }

    //POST /readers/:id/suggestBuying
    suggestBuying(req, res, next) {
        sql.connect(config)
            .then((pool) => {
                let book = { ...req.body };
                let suggestBuying = pool
                    .request()
                    .input('BookISBN', sql.Char, book.BookISBN)
                    .input('Reason', sql.NVarChar, book.Reason)
                    .input('BookMajor', sql.NVarChar, book.BookMajor)
                    .input('ReaderID', sql.Int, req.params.id)
                    .query(
                        'INSERT INTO SuggestedBuying (BookISBN, Reason, BookMajor, ReaderID) values (@BookISBN, @Reason, @BookMajor, @ReaderID)',
                    );
                return suggestBuying;
            })
            .then((result) => {
                res.send(result.recordsets[0]);
            })
            .catch((err) => {
                console.log(err);
            });
    }

    //PUT /readers/updateBorrowedBook/:id
    updateBorrowedBook(req, res, next) {
        sql.connect(config)
            .then(async (pool) => {
                let book = { ...req.body };
                let updateBorrowBook = pool
                    .request()
                    .input('ID', sql.Int, req.params.id)
                    .input('StartTime', sql.Date, book.StartTime)
                    .input('EndTime', sql.Date, book.EndTime)
                    .input('ExtendedDate', sql.Date, book.ExtendedDate)
                    .query(
                        'UPDATE BorrowedBook SET StartTime = @StartTime,  EndTime = @EndTime, ExtendedDate = @ExtendedDate  WHERE ID = @ID',
                    );
                return updateBorrowBook;
            })
            .then((result) => {
                res.send(result.recordsets[0]);
            })
            .catch((err) => {
                console.log(err);
            });
    }
    //GET /borrowingSchedule
    async borrowingScheduleListAdmin(req, res, next) {
        sql.connect(config)
            .then(async (pool) => {
                let readerFavourite = await pool
                    .request()
                    .query(
                        `SELECT * FROM borrowingSchedule join book on bookISBN = ISBN join reader on uniID = readerUniID`,
                    );
                return readerFavourite;
            })
            .then((result) => {
                const borrowingList = result.recordsets[0];
                if (borrowingList == null) {
                    res.status(404).send({
                        message: 'Không có sách đang đặt lịch mượn!',
                    });
                }
                res.status(200).send({ borrowingList });
            })
            .catch((err) => {
                console.log(err);
                res.status(400).send({
                    message: 'Thông tin sai, vui lòng thử lại!',
                });
            });
    }
    //GET /me/borrowingSchedule
    async borrowingScheduleList(req, res, next) {
        sql.connect(config)
            .then(async (pool) => {
                let readerFavourite = await pool
                    .request()
                    .input('uniID', sql.VarChar, req.jwtDecoded.user.uniID)
                    .query(
                        `SELECT * FROM borrowingSchedule join book on bookISBN = ISBN where readerUniID = @uniID`,
                    );
                return readerFavourite;
            })
            .then((result) => {
                const borrowingList = result.recordsets[0];
                if (borrowingList == null) {
                    res.status(404).send({
                        message: 'Không có sách đang đặt lịch mượn!',
                    });
                }
                res.status(200).send({ borrowingList });
            })
            .catch((err) => {
                console.log(err);
                res.status(400).send({
                    message: 'Thông tin sai, vui lòng thử lại!',
                });
            });
    }
    //GET /me/favourite
    async favouriteBookList(req, res, next) {
        const book = { ...req.body };
        sql.connect(config)
            .then(async (pool) => {
                let readerFavourite = await pool
                    .request()
                    .input('uniID', sql.VarChar, req.jwtDecoded.user.uniID)
                    .query(
                        `SELECT * FROM favoriteBooks join book on bookISBN = ISBN where readerUniID = @uniID`,
                    );
                return readerFavourite;
            })
            .then((result) => {
                const favouriteList = result.recordsets[0];
                delete favouriteList.bookISBN;
                delete favouriteList.readerUniID;
                if (favouriteList == null) {
                    res.status(404).send({
                        message: 'Không có sách yêu thích!',
                    });
                }
                res.status(200).send({ favouriteList });
            })
            .catch((err) => {
                console.log(err);
                res.status(400).send({
                    message: 'Thông tin sai, vui lòng thử lại!',
                });
            });
    }
    //POST /me/favourite/:isbn
    async favouriteBook(req, res, next) {
        sql.connect(config)
            .then(async (pool) => {
                let readerFavourite = await pool
                    .request()
                    .input('uniID', sql.VarChar, req.jwtDecoded.user.uniID)
                    .input('bookISBN', sql.VarChar, req.params.isbn)
                    .query(
                        `INSERT INTO favoriteBooks (readerUniID, bookISBN) Values (@uniID, @bookISBN)`,
                    );
                return readerFavourite;
            })
            .then((result) => {
                res.status(200).send({ message: 'Thành công' });
            })
            .catch((err) => {
                console.log(err);
                if (err.class === 14) {
                    res.status(409).send({
                        message: 'Đã yêu thích sách này!',
                    });
                }
                if (err.class === 16) {
                    res.status(404).send({
                        message: 'Sách không tồn tại!',
                    });
                }
                res.status(400).send({
                    message: 'Thông tin sai, vui lòng thử lại!',
                });
            });
    }
    //DELETE /me/unfavourite
    async unfavouriteBook(req, res, next) {
        sql.connect(config)
            .then(async (pool) => {
                let readerFavourite = await pool
                    .request()
                    .input('uniID', sql.VarChar, req.jwtDecoded.user.uniID)
                    .input('bookISBN', sql.VarChar, req.params.isbn)
                    .query(
                        `select * from favoriteBooks where readerUniID = @uniID and bookISBN = @bookISBN; DELETE FROM favoriteBooks where readerUniID = @uniID and bookISBN = @bookISBN; select * from favoriteBooks where readerUniID = @uniID and bookISBN = @bookISBN`,
                    );
                return readerFavourite;
            })
            .then((result) => {
                if (result.recordsets[0][0] == null) {
                    res.status(404).send({
                        message: 'Đã hủy yêu thích sách này!',
                    });
                } else if (result.recordsets[2] == null) {
                    res.status(200).send({ message: 'Thành công' });
                } else {
                    res.status(400).send({
                        message: 'Thông tin sai, vui lòng thử lại!',
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
}

module.exports = new ReadersController();
