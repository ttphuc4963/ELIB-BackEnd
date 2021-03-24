const express = require('express');
const router = express.Router();
const TagsController = require('../app/controllers/TagsController');

router.get('/', TagsController.showAll);
router.get('/:id', TagsController.show);
router.post('/', TagsController.create);
router.put('/:id', TagsController.update);
router.delete('/:id', TagsController.destroy);
module.exports = router;
