const express = require('express');
const router = express.Router();
const virtualMachinesController = require('../controllers/virtualMachinesController');
const { authenticateToken, checkAdmin } = require('../middleware/auth');

// Все маршруты требуют аутентификации
router.use(authenticateToken);

// Основные CRUD
router.get('/', virtualMachinesController.getAllVMs);
router.get('/:id', virtualMachinesController.getVMById);
router.post('/', virtualMachinesController.createVM);
router.patch('/:id', virtualMachinesController.updateVM);
router.delete('/:id', virtualMachinesController.deleteVM);

// Действия с ВМ
router.post('/:id/start', virtualMachinesController.startVM);
router.post('/:id/stop', virtualMachinesController.stopVM);
// router.post('/:id/restart', virtualMachinesController.restartVM); // опционально

module.exports = router;