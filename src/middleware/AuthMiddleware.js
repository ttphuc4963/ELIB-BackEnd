const jwtHelper = require('../helpers/jwt.helper');
const jwt = require('jsonwebtoken');
const sql = require('mssql');
const config = require('../config/db');
const debug = console.log.bind(console);
const accessTokenLife = process.env.ACCESS_TOKEN_LIFE || '1h';

const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
/*
 * Middleware: Authorization user by Token
 * @param {*} req
 * @param {*} res
 * @param {*} next
 */

const verifyRefreshToken = async (uniID, refreshToken) => {
    await sql.connect(config);
    const result = await sql.query`select * from reader where uniID = ${uniID} and refreshToken=${refreshToken}`;
    if (result.recordset.length !== 0) {
        return true;
    }
    return false;
};

let getNewToken = async (oldAccessToken, refreshToken) => {
    if (refreshToken) {
        try {
            const decode = jwt.verify(
                oldAccessToken,
                process.env.ACCESS_TOKEN_SECRET,
                {
                    ignoreExpiration: true,
                },
            );
            const _uniID = decode.user.uniID;

            const isUser = await verifyRefreshToken(_uniID, refreshToken);
            if (isUser === false) {
                throw 'Thông tin người dùng không hợp lệ';
            }
            const user = {
                uniID: _uniID,
                role: decode.user.role,
            };
            const accessToken = await jwtHelper.generateToken(
                user,
                process.env.ACCESS_TOKEN_SECRET,
                accessTokenLife,
            );
            // gửi token mới về cho người dùng
            return accessToken;
        } catch (error) {
            console.log(error);
            return false;
        }
    } else {
        return false;
    }
};

let isAuth = async (req, res, next) => {
    const accessToken = req.headers['x-access-token'];
    const refreshToken = req.headers['x-refresh-token'];

    if (accessToken) {
        try {
            const decoded = await jwtHelper.verifyToken(
                accessToken,
                process.env.ACCESS_TOKEN_SECRET,
            );
            req.jwtDecoded = decoded;
            next();
        } catch (error) {
            const newAccessToken = await getNewToken(accessToken, refreshToken);
            if (newAccessToken === false)
                return res.status(403).json({
                    message: 'Cần làm mới Access Token!',
                });
            else {
                const decoded = await jwtHelper.verifyToken(
                    newAccessToken,
                    process.env.ACCESS_TOKEN_SECRET,
                );
                req.jwtDecoded = decoded;
                next();
            }
        }
    } else {
        return res.status(403).send({
            message: 'Chưa cung cấp mã Token!',
        });
    }
};

const isAdmin = async (req, res, next) => {
    if (!req.jwtDecoded) {
        res.status(400).send({
            message: 'Thông tin người dùng không tồn tại',
        });
    }
    const userData = req.jwtDecoded;
    if (userData.user.role.toLowerCase() !== 'admin') {
        res.status(403).send({
            message: 'Người dùng không hợp lệ',
        });
    }
    next();
};

module.exports = {
    isAuth,
    isAdmin,
    getNewToken,
};
