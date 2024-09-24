const { Router } = require('express');
const router = Router();
const {
  createPost,
  editPost,
  deletePost,
  getCatPosts,
  getUserPosts,
  getPosts,
  getPost // Corrected this
} = require('../controllers/postControllers');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, createPost);
router.get('/', getPosts);
router.get('/:id', getPost); // Corrected this
router.patch('/:id', authMiddleware, editPost);
router.get('/users/:id', getUserPosts);
router.get('/categories/:category', getCatPosts);
router.delete('/:id', authMiddleware, deletePost);

module.exports = router;
