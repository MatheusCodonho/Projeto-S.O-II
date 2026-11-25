const express = require('express');
const router = express.Router();
const { register, login, logout, listUsers, deleteUser } = require('../controllers/authController');
const { authenticate, optionalAuth, authorize } = require('../middleware/auth');
const { ROLES } = require('../models/User');

router.post('/register', optionalAuth, register);
router.post('/login', login);
router.post('/logout', authenticate, logout);

// Gerenciamento de usuários (apenas ADMIN)
router.get('/users', authenticate, authorize(ROLES.ADMIN), listUsers);
router.delete('/users/:id', authenticate, authorize(ROLES.ADMIN), deleteUser);

module.exports = router;
