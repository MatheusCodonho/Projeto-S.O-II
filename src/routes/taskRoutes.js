const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authenticate, authorize } = require('../middleware/auth');
const { ROLES } = require('../models/User');

router.use(authenticate);

router.get('/project/:projectId', taskController.listByProject);
router.post('/', authorize(ROLES.ADMIN, ROLES.MANAGER), taskController.create);
router.patch('/:id/status', taskController.updateStatus); // Qualquer um autenticado pode mudar status se for relevante
router.delete('/:id', authorize(ROLES.ADMIN, ROLES.MANAGER), taskController.delete);

module.exports = router;
