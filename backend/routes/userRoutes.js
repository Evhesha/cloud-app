const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const {
  getProfile,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser
} = require('../controllers/userController');

const router = express.Router();

// Все маршруты ниже защищены middleware authenticateToken
router.use(authenticateToken);

router.get('/profile', getProfile);
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

module.exports = router;