const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken } = require('../middleware/auth');

router.get('/summary', authenticateToken, dashboardController.getSummary);
router.get('/alerts', authenticateToken, dashboardController.getAlerts);
router.get('/stats', authenticateToken, dashboardController.getStats);
router.put('/alerts/:id/dismiss', authenticateToken, dashboardController.dismissAlert);

module.exports = router;
