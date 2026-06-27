const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/lookup', customerController.lookupByPhone);
router.get('/', authenticateToken, customerController.getAllCustomers);
router.post('/', authenticateToken, customerController.createCustomer);
router.get('/:id', authenticateToken, customerController.getCustomerById);
router.put('/:id', authenticateToken, customerController.updateCustomer);
router.delete('/:id', authenticateToken, requireRole('admin'), customerController.deleteCustomer);

module.exports = router;
