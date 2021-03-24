const express = require('express');
const router = express.Router();
const ReadersController = require('../app/controllers/ReadersController');
const AuthController = require('../app/controllers/AuthController');
const AuthMiddleWare = require('../middleware/AuthMiddleware');

router.post('/register', ReadersController.register);
router.post('/login', AuthController.login);
router.post('/refresh-token', AuthController.renewToken);
router.get('/:uniID/verify-email', ReadersController.verifyEmail);

router.use(AuthMiddleWare.isAuth);

router.get('/:id/borrowedBooks/', ReadersController.borrowedBooks);
router.get('/:id/returnedBooks/', ReadersController.returnedBooks);
router.post(
    '/borrowingSchedule/:bookISBN',
    ReadersController.borrowingSchedule,
);
router.get('/me/borrowingSchedule', ReadersController.borrowingScheduleList);
router.post('/:id/borrowBook/:bookID', ReadersController.borrowBook);
router.post('/:id/returnBooks', ReadersController.returnBook);
router.post('/:id/suggestBuying', ReadersController.suggestBuying);

// cập nhật thông tin người dùng
router.put('/me', ReadersController.update);
router.put('/:id', ReadersController.updateAdmin);
//yêu thích sách
router.post('/me/favourite/:isbn', ReadersController.favouriteBook);
router.delete('/me/unfavourite/:isbn', ReadersController.unfavouriteBook);
router.get('/me/favourite', ReadersController.favouriteBookList);
// đổi mật khẩu
router.post('/me/change-password', ReadersController.changePassword);
router.get('/me', ReadersController.showMe);

// kiểm tra admin
router.use(AuthMiddleWare.isAdmin);

router.get('/borrowingSchedule', ReadersController.borrowingScheduleListAdmin);
router.put('/updateBorrowedBook/:id', ReadersController.updateBorrowedBook);
router.get('/:id', ReadersController.show);
router.delete('/:id', ReadersController.destroy);
router.get('/', ReadersController.showAll);
module.exports = router;
