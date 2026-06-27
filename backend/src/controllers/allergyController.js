const db = require('../config/db');

// Audit logger helper
const logActivity = async (userId, userName, action, details) => {
  try {
    await db.run(
      'INSERT INTO audit_logs (user_id, user_name, action, details) VALUES (?, ?, ?, ?)',
      [userId, userName, action, details]
    );
  } catch (err) {
    console.error('Audit logging failed:', err);
  }
};

// --- Allergy Registry Operations ---

exports.getAllAllergies = async (req, res) => {
  try {
    const allergies = await db.query('SELECT * FROM allergies ORDER BY severity DESC, allergy_name ASC');
    return res.json({ success: true, data: allergies });
  } catch (err) {
    console.error('Error fetching allergies:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve allergy list.' });
  }
};

exports.createAllergy = async (req, res) => {
  const { allergy_name, severity, description, trigger_ingredients } = req.body;

  if (!allergy_name || !severity) {
    return res.status(400).json({ success: false, message: 'Allergy name and severity level are required.' });
  }

  try {
    const normalizedName = allergy_name.trim();
    const normalizedTriggers = trigger_ingredients ? trigger_ingredients.toLowerCase().trim() : '';

    const exists = await db.get('SELECT * FROM allergies WHERE allergy_name = ?', [normalizedName]);
    if (exists) {
      return res.status(400).json({ success: false, message: 'An allergy category with this name already exists.' });
    }

    const result = await db.run(
      `INSERT INTO allergies (allergy_name, severity, description, trigger_ingredients) 
       VALUES (?, ?, ?, ?)`,
      [normalizedName, severity, description || '', normalizedTriggers]
    );

    await logActivity(
      req.user.id,
      req.user.name,
      'ALLERGY_CREATE',
      `Created allergy category: ${normalizedName} (Severity: ${severity})`
    );

    return res.status(201).json({
      success: true,
      message: 'Allergy category registered successfully.',
      data: { id: result.id, allergy_name: normalizedName, severity, description, trigger_ingredients: normalizedTriggers }
    });
  } catch (err) {
    console.error('Error creating allergy category:', err);
    return res.status(500).json({ success: false, message: 'Server error while registering allergy.' });
  }
};

exports.updateAllergy = async (req, res) => {
  const { id } = req.params;
  const { allergy_name, severity, description, trigger_ingredients } = req.body;

  if (!allergy_name || !severity) {
    return res.status(400).json({ success: false, message: 'Allergy name and severity level are required.' });
  }

  try {
    const allergy = await db.get('SELECT allergy_name FROM allergies WHERE id = ?', [id]);
    if (!allergy) {
      return res.status(404).json({ success: false, message: 'Allergy registry entry not found.' });
    }

    const normalizedTriggers = trigger_ingredients ? trigger_ingredients.toLowerCase().trim() : '';

    await db.run(
      `UPDATE allergies 
       SET allergy_name = ?, severity = ?, description = ?, trigger_ingredients = ? 
       WHERE id = ?`,
      [allergy_name, severity, description || '', normalizedTriggers, id]
    );

    await logActivity(
      req.user.id,
      req.user.name,
      'ALLERGY_UPDATE',
      `Updated allergy category: ${allergy_name} (ID: ${id})`
    );

    return res.json({ success: true, message: 'Allergy registry entry updated successfully.' });
  } catch (err) {
    console.error('Error updating allergy category:', err);
    return res.status(500).json({ success: false, message: 'Server error while updating allergy.' });
  }
};

exports.deleteAllergy = async (req, res) => {
  const { id } = req.params;

  try {
    const allergy = await db.get('SELECT allergy_name FROM allergies WHERE id = ?', [id]);
    if (!allergy) {
      return res.status(404).json({ success: false, message: 'Allergy registry entry not found.' });
    }

    await db.run('DELETE FROM allergies WHERE id = ?', [id]);

    await logActivity(
      req.user.id,
      req.user.name,
      'ALLERGY_DELETE',
      `Deleted allergy category: ${allergy.allergy_name} (ID: ${id})`
    );

    return res.json({ success: true, message: 'Allergy category removed successfully.' });
  } catch (err) {
    console.error('Error deleting allergy category:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete allergy category.' });
  }
};

// --- Dietary Preferences Registry Operations ---

exports.getAllDietaryPreferences = async (req, res) => {
  try {
    const preferences = await db.query('SELECT * FROM dietary_preferences ORDER BY preference_name ASC');
    return res.json({ success: true, data: preferences });
  } catch (err) {
    console.error('Error fetching dietary preferences:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve dietary preferences.' });
  }
};

exports.createDietaryPreference = async (req, res) => {
  const { preference_name, forbidden_ingredients } = req.body;

  if (!preference_name) {
    return res.status(400).json({ success: false, message: 'Preference name is required.' });
  }

  try {
    const normalizedName = preference_name.trim();
    const normalizedForbidden = forbidden_ingredients ? forbidden_ingredients.toLowerCase().trim() : '';

    const exists = await db.get('SELECT * FROM dietary_preferences WHERE preference_name = ?', [normalizedName]);
    if (exists) {
      return res.status(400).json({ success: false, message: 'This dietary preference already exists.' });
    }

    const result = await db.run(
      'INSERT INTO dietary_preferences (preference_name, forbidden_ingredients) VALUES (?, ?)',
      [normalizedName, normalizedForbidden]
    );

    await logActivity(
      req.user.id,
      req.user.name,
      'DIETARY_PREF_CREATE',
      `Created dietary preference option: ${normalizedName}`
    );

    return res.status(201).json({
      success: true,
      message: 'Dietary preference created successfully.',
      data: { id: result.id, preference_name: normalizedName, forbidden_ingredients: normalizedForbidden }
    });
  } catch (err) {
    console.error('Error creating dietary preference:', err);
    return res.status(500).json({ success: false, message: 'Server error while creating dietary preference.' });
  }
};

exports.updateDietaryPreference = async (req, res) => {
  const { id } = req.params;
  const { preference_name, forbidden_ingredients } = req.body;

  if (!preference_name) {
    return res.status(400).json({ success: false, message: 'Preference name is required.' });
  }

  try {
    const pref = await db.get('SELECT preference_name FROM dietary_preferences WHERE id = ?', [id]);
    if (!pref) {
      return res.status(404).json({ success: false, message: 'Dietary preference not found.' });
    }

    const normalizedForbidden = forbidden_ingredients ? forbidden_ingredients.toLowerCase().trim() : '';

    await db.run(
      'UPDATE dietary_preferences SET preference_name = ?, forbidden_ingredients = ? WHERE id = ?',
      [preference_name.trim(), normalizedForbidden, id]
    );

    await logActivity(
      req.user.id,
      req.user.name,
      'DIETARY_PREF_UPDATE',
      `Updated dietary preference option: ${preference_name} (ID: ${id})`
    );

    return res.json({ success: true, message: 'Dietary preference updated successfully.' });
  } catch (err) {
    console.error('Error updating dietary preference:', err);
    return res.status(500).json({ success: false, message: 'Server error while updating dietary preference.' });
  }
};

exports.deleteDietaryPreference = async (req, res) => {
  const { id } = req.params;

  try {
    const pref = await db.get('SELECT preference_name FROM dietary_preferences WHERE id = ?', [id]);
    if (!pref) {
      return res.status(404).json({ success: false, message: 'Dietary preference not found.' });
    }

    await db.run('DELETE FROM dietary_preferences WHERE id = ?', [id]);

    await logActivity(
      req.user.id,
      req.user.name,
      'DIETARY_PREF_DELETE',
      `Deleted dietary preference option: ${pref.preference_name} (ID: ${id})`
    );

    return res.json({ success: true, message: 'Dietary preference removed successfully.' });
  } catch (err) {
    console.error('Error deleting dietary preference:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete dietary preference.' });
  }
};
