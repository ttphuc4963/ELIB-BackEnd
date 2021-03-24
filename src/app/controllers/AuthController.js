require('dotenv').config();
const config = require('../../config/db/index');
const sql = require('mssql');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const randomToken = require('random-token');
const jwtHelper = require('../../helpers/jwt.helper');
const { getNewToken } = require('../../middleware/AuthMiddleware');
const debug = console.log.bind(console);
// Biến cục bộ trên server này sẽ lưu trữ tạm danh sách token
// Trong dự án thực tế, nên lưu chỗ khác, có thể lưu vào Redis hoặc DB
// Thời gian sống của token
const accessTokenLife = process.env.ACCESS_TOKEN_LIFE || '1h';
// Mã secretKey này phải được bảo mật tuyệt đối, các bạn có thể lưu vào biến môi trường hoặc file
const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
/*
 * controller login
 * @param {*} req
 * @param {*} res
 */
//POST /readers/login

const updateRefreshToken = async (uniID, refreshToken) => {
    await sql.connect(config).then(async (pool) => {
        await pool
            .request()
            .input('refreshToken', sql.VarChar, refreshToken)
            .input('uniID', sql.VarChar, uniID)
            .query(
                'update reader set refreshToken = @refreshToken WHERE (uniID = @uniID)',
            );
    });
};

let login = async (req, res, next) => {
    sql.connect(config)
        .then((pool) => {
            let user = { ...req.body };
            let findUser = pool
                .request()
                .input('email', sql.VarChar, user.email)
                .query('SELECT * FROM reader WHERE (email = @email)');
            return findUser;
        })
        .then(async (result) => {
            const reader = result.recordsets[0];
            const user = reader[0];
            if (reader[0] == null) {
                return res
                    .status(404)
                    .send({ message: 'Không tìm thấy người dùng' });
            }
            try {
                if (user.status.toLowerCase() == 'disable') {
                    console.log('aaa');
                    throw 'Vui lòng kiểm tra email để kích hoạt tài khoản!';
                }
                if (await bcrypt.compare(req.body.password, user.password)) {
                    const userData = {
                        uniID: user.uniID,
                        role: user.type,
                    };
                    const accessToken = await jwtHelper.generateToken(
                        userData,
                        accessTokenSecret,
                        accessTokenLife,
                    );
                    console.log(accessTokenSecret);
                    const refreshToken = randomToken(80);
                    updateRefreshToken(user.uniID, refreshToken);
                    const userInfor = user;
                    delete userInfor.password;
                    delete userInfor.note;
                    delete userInfor.refreshToken;

                    return res
                        .status(200)
                        .json({ accessToken, userInfor, refreshToken });
                } else {
                    res.status(400).send({
                        message: 'Email hoặc mật khẩu sai!',
                    });
                }
            } catch (error) {
                res.status(500).send({ message: error });
            }
        })
        .catch((err) => {
            console.log(err);
        });
};

// function to re new token
const renewToken = async (req, res, next) => {
    try {
        const accessToken = req.headers['x-access-token'];
        const refreshToken = req.headers['x-refresh-token'];
        if (!accessToken || !refreshToken) {
            throw 'Không cung cấp Token!';
        }
        const newToken = await getNewToken(accessToken, refreshToken);
        if (newToken === false) {
            res.status(400).send({
                message: 'Refresh Token không hợp lệ!',
            });
        } else {
            res.status(200).send({
                accessToken: newToken,
            });
        }
    } catch (error) {
        res.status(403).send({
            message: error.toString(),
        });
    }
};

/*
 * controller refreshToken
 * @param {*} req
 * @param {*} res
 */

module.exports = {
    login: login,
    renewToken,
    updateRefreshToken,
};
