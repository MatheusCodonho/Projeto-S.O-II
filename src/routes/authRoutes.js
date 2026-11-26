const express = require('express');
const router = express.Router();
const { register, login, logout, listUsers, deleteUser, updateUser, mfaSetup, mfaEnable, mfaDisable, mfaStatus } = require('../controllers/authController');
const { authenticate, optionalAuth, authorize } = require('../middleware/auth');
const { ROLES } = require('../models/User');

router.post('/register', optionalAuth, register);
router.post('/login', login);
router.post('/logout', authenticate, logout);

// MFA (Autenticação Multifator) - requer autenticação
router.get('/mfa/status', authenticate, mfaStatus);
router.post('/mfa/setup', authenticate, mfaSetup);
router.post('/mfa/enable', authenticate, mfaEnable);
router.post('/mfa/disable', authenticate, mfaDisable);

// Gerenciamento de usuários (apenas ADMIN)
router.get('/users', authenticate, authorize(ROLES.ADMIN), listUsers);
router.put('/users/:id', authenticate, authorize(ROLES.ADMIN), updateUser);
router.delete('/users/:id', authenticate, authorize(ROLES.ADMIN), deleteUser);

module.exports = router;
