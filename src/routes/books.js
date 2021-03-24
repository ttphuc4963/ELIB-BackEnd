const express = require('express');
const router = express.Router();
const BooksController = require('../app/controllers/BooksController');

const AuthMiddleWare = require('../middleware/AuthMiddleware');

router.get('/importByCsv', BooksController.importByCsv);
//router.get('/:id/tags', BooksController.showTags);
router.get('/byTag/:id', BooksController.getBookByTags);
router.get('/:isbn', BooksController.show);
router.get('/:isbn/copy', BooksController.showBookCopies);

router.get('/', BooksController.showAll);

//Auth middle ware
router.use(AuthMiddleWare.isAuth);

router.post('/:isbn/addTag/:tagID', BooksController.addTag);

// kiểm tra admin
// router.use(AuthMiddleWare.isAdmin);

router.get('/suggestedBuying', BooksController.suggestedBuying);
router.post('/', BooksController.store);
router.post('/:isbn/copy', BooksController.storeBookCopy);
router.put('/:isbn', BooksController.update);
router.delete('/:isbn', BooksController.destroy);

module.exports = router;
