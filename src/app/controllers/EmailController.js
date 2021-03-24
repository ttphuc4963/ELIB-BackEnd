require('dotenv').config();

const nodemailer = require('nodemailer');

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

module.exports = {
    transporter: transporter,
    mailOptions: mailOptions,
};
