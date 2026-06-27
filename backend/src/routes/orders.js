const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/', authenticateToken, orderController.getAllOrders);
router.post('/', orderController.createOrder);
router.get('/:id', authenticateToken, orderController.getOrderById);
router.put('/:id', authenticateToken, orderController.updateOrder);
router.delete('/:id', authenticateToken, requireRole('admin'), orderController.deleteOrder);
router.put('/:id/status', authenticateToken, orderController.updateOrderStatus);
router.put('/:id/approve', authenticateToken, requireRole('admin'), orderController.approveOrder);

module.exports = router;
