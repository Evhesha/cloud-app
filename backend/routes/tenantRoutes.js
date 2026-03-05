const express = require('express');
const { authenticateToken, checkAdmin } = require('../middleware/auth');
const tenantController = require('../controllers/tenantController');
const router = express.Router();

router.use(authenticateToken);

router.get('/', checkAdmin, tenantController.getAllTenants);
router.get('/me', tenantController.getMyTenant);
router.post('/', tenantController.createTenant);
router.patch('/:id', tenantController.updateTenant);
router.delete('/:id', tenantController.deleteTenant);
router.get('/:id/users', checkAdmin, tenantController.getTenantUsers);
router.post('/:id/users', checkAdmin, tenantController.addUserToTenant);
router.delete('/:id/users/:userId', checkAdmin, tenantController.removeUserFromTenant);

module.exports = router;