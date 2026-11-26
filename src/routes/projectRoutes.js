const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { authenticate, authorize } = require('../middleware/auth');
const { ROLES } = require('../models/User');

router.use(authenticate); // Todas as rotas de projeto exigem login

router.get('/', projectController.list);
router.get('/:id', projectController.getById);

// Apenas ADMIN e MANAGER podem criar/editar/deletar projetos
router.post('/', authorize(ROLES.ADMIN, ROLES.MANAGER), projectController.create);
router.put('/:id', authorize(ROLES.ADMIN, ROLES.MANAGER), projectController.update);
router.delete('/:id', authorize(ROLES.ADMIN, ROLES.MANAGER), projectController.delete);

module.exports = router;
