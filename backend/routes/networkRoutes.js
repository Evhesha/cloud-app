const express = require('express');
const router = express.Router();
const networkController = require('../controllers/networkController');
const { authenticateToken, checkAdmin } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', networkController.getAllNetworks);
router.get('/:id', networkController.getNetworkById);
router.post('/', networkController.createNetwork);
router.patch('/:id', networkController.updateNetwork);
router.delete('/:id', networkController.deleteNetwork);

module.exports = router;