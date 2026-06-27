const express = require('express');
const router = express.Router();
const allergyController = require('../controllers/allergyController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Allergy Registry Routes
router.get('/', authenticateToken, allergyController.getAllAllergies);
router.post('/', authenticateToken, requireRole('admin'), allergyController.createAllergy);
router.put('/:id', authenticateToken, requireRole('admin'), allergyController.updateAllergy);
router.delete('/:id', authenticateToken, requireRole('admin'), allergyController.deleteAllergy);

// Dietary Preference Registry Routes
router.get('/dietary', authenticateToken, allergyController.getAllDietaryPreferences);
router.post('/dietary', authenticateToken, requireRole('admin'), allergyController.createDietaryPreference);
router.put('/dietary/:id', authenticateToken, requireRole('admin'), allergyController.updateDietaryPreference);
router.delete('/dietary/:id', authenticateToken, requireRole('admin'), allergyController.deleteDietaryPreference);

module.exports = router;
