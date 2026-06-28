const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken, requireRole } = require('../middleware/auth');

router.get('/summary', authenticateToken, reportController.getReportData);
router.get('/export/:type', authenticateToken, requireRole('admin'), reportController.exportCSV);
router.get('/audit', authenticateToken, requireRole('admin'), reportController.getAuditLogs);

module.exports = router;
