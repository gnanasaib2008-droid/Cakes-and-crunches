const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authenticateToken } = require('../middleware/auth');

// Make the AI parsing assistant public so both staff and online self-ordering customers can use it
router.post('/parse-ingredients', aiController.parseIngredients);

module.exports = router;
