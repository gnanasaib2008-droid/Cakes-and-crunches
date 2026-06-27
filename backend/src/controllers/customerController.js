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

exports.getAllCustomers = async (req, res) => {
  let { search, status, page, limit, sort, order } = req.query;
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;
  const offset = (page - 1) * limit;

  let queryStr = 'SELECT * FROM customers WHERE 1=1';
  const params = [];

  if (search) {
    queryStr += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam);
  }

  if (status) {
    queryStr += ' AND status = ?';
    params.push(status);
  }

  try {
    // Get total count for pagination
    let countQuery = queryStr.replace('SELECT *', 'SELECT COUNT(*) as count');
    const totalCountRow = await db.get(countQuery, params);
    const total = totalCountRow ? totalCountRow.count : 0;

    // Validate sort field
    const allowedSortFields = ['id', 'name', 'email', 'phone', 'status', 'created_at'];
    const sortCol = allowedSortFields.includes(sort) ? sort : 'created_at';
    const sortOrder = (order && order.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';

    // Apply pagination
    queryStr += ` ORDER BY ${sortCol} ${sortOrder} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const customers = await db.query(queryStr, params);

    // Fetch allergies for each customer to show basic badges in list
    for (let customer of customers) {
      const allergies = await db.query(
        `SELECT a.allergy_name, a.severity 
         FROM customer_allergies ca 
         JOIN allergies a ON ca.allergy_id = a.id 
         WHERE ca.customer_id = ?`,
        [customer.id]
      );
      customer.allergies = allergies;
    }

    return res.json({
      success: true,
      data: customers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Error fetching customers:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch customers.' });
  }
};

exports.getCustomerById = async (req, res) => {
  const { id } = req.params;

  try {
    const customer = await db.get('SELECT * FROM customers WHERE id = ?', [id]);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    // Mapped Allergies
    const allergies = await db.query(
      `SELECT a.id, a.allergy_name, a.severity, a.description, a.trigger_ingredients 
       FROM customer_allergies ca 
       JOIN allergies a ON ca.allergy_id = a.id 
       WHERE ca.customer_id = ?`,
      [id]
    );

    // Mapped Dietary Preferences
    const preferences = await db.query(
      `SELECT dp.id, dp.preference_name, dp.forbidden_ingredients 
       FROM customer_preferences cp 
       JOIN dietary_preferences dp ON cp.preference_id = dp.id 
       WHERE cp.customer_id = ?`,
      [id]
    );

    // Order History
    const orders = await db.query(
      'SELECT * FROM orders WHERE customer_id = ? ORDER BY order_date DESC',
      [id]
    );

    // Alerts Center Warnings
    const alerts = await db.query(
      'SELECT * FROM alerts WHERE customer_id = ? ORDER BY created_at DESC',
      [id]
    );

    // Activity timeline from logs
    const activityTimeline = await db.query(
      `SELECT * FROM audit_logs 
       WHERE details LIKE ? OR details LIKE ? 
       ORDER BY created_at DESC`,
      [`%customer ID: ${id}%`, `%customer named ${customer.name}%`]
    );

    return res.json({
      success: true,
      data: {
        ...customer,
        allergies,
        preferences,
        orders,
        alerts,
        activityTimeline
      }
    });
  } catch (err) {
    console.error('Error fetching customer details:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch customer profile details.' });
  }
};

exports.createCustomer = async (req, res) => {
  const { name, email, phone, address, dob, notes, allergies, preferences } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: 'Customer name is required.' });
  }

  try {
    // Create customer profile
    const result = await db.run(
      `INSERT INTO customers (name, email, phone, address, dob, notes, status) 
       VALUES (?, ?, ?, ?, ?, ?, 'active')`,
      [name, email, phone, address, dob, notes]
    );

    const customerId = result.id;

    // Map allergies (array of allergy IDs)
    if (allergies && Array.isArray(allergies)) {
      for (const allergyId of allergies) {
        await db.run(
          'INSERT INTO customer_allergies (customer_id, allergy_id) VALUES (?, ?)',
          [customerId, allergyId]
        );
      }
    }

    // Map preferences (array of preference IDs)
    if (preferences && Array.isArray(preferences)) {
      for (const prefId of preferences) {
        await db.run(
          'INSERT INTO customer_preferences (customer_id, preference_id) VALUES (?, ?)',
          [customerId, prefId]
        );
      }
    }

    // Create safety notifications if customer info is critically missing (e.g. phone/address/email empty)
    if (!phone || !email) {
      await db.run(
        `INSERT INTO alerts (customer_id, alert_type, severity, message) 
         VALUES (?, 'missing_info', 'info', ?)`,
        [customerId, `Customer profile "${name}" has missing contact details (Email/Phone).`]
      );
    }

    await logActivity(
      req.user.id,
      req.user.name,
      'CUSTOMER_CREATE',
      `Created customer profile for "${name}" (customer ID: ${customerId})`
    );

    return res.status(201).json({
      success: true,
      message: 'Customer profile created successfully.',
      customerId
    });
  } catch (err) {
    console.error('Error creating customer:', err);
    return res.status(500).json({ success: false, message: 'Server error while creating customer.' });
  }
};

exports.updateCustomer = async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, address, dob, notes, status, allergies, preferences } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: 'Customer name is required.' });
  }

  try {
    const customer = await db.get('SELECT name FROM customers WHERE id = ?', [id]);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    // Update profile
    await db.run(
      `UPDATE customers 
       SET name = ?, email = ?, phone = ?, address = ?, dob = ?, notes = ?, status = ? 
       WHERE id = ?`,
      [name, email, phone, address, dob, notes, status || 'active', id]
    );

    // Clear and rebuild allergy mappings
    await db.run('DELETE FROM customer_allergies WHERE customer_id = ?', [id]);
    if (allergies && Array.isArray(allergies)) {
      for (const allergyId of allergies) {
        await db.run(
          'INSERT INTO customer_allergies (customer_id, allergy_id) VALUES (?, ?)',
          [id, allergyId]
        );
      }
    }

    // Clear and rebuild preference mappings
    await db.run('DELETE FROM customer_preferences WHERE customer_id = ?', [id]);
    if (preferences && Array.isArray(preferences)) {
      for (const prefId of preferences) {
        await db.run(
          'INSERT INTO customer_preferences (customer_id, preference_id) VALUES (?, ?)',
          [id, prefId]
        );
      }
    }

    await logActivity(
      req.user.id,
      req.user.name,
      'CUSTOMER_UPDATE',
      `Updated customer profile for "${name}" (customer ID: ${id})`
    );

    return res.json({ success: true, message: 'Customer profile updated successfully.' });
  } catch (err) {
    console.error('Error updating customer:', err);
    return res.status(500).json({ success: false, message: 'Server error while updating customer.' });
  }
};

exports.deleteCustomer = async (req, res) => {
  const { id } = req.params;

  try {
    const customer = await db.get('SELECT name FROM customers WHERE id = ?', [id]);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    await db.run('DELETE FROM customers WHERE id = ?', [id]);

    await logActivity(
      req.user.id,
      req.user.name,
      'CUSTOMER_DELETE',
      `Deleted customer profile for "${customer.name}" (customer ID: ${id})`
    );

    return res.json({ success: true, message: 'Customer profile deleted successfully.' });
  } catch (err) {
    console.error('Error deleting customer:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete customer profile.' });
  }
};

exports.lookupByPhone = async (req, res) => {
  const { phone } = req.query;

  if (!phone) {
    return res.status(400).json({ success: false, message: 'Phone number is required for lookup.' });
  }

  try {
    // Find customer by exact phone match
    const customer = await db.get('SELECT * FROM customers WHERE phone = ?', [phone]);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    // Fetch their allergies
    const allergies = await db.query(
      `SELECT a.id, a.allergy_name, a.severity, a.trigger_ingredients 
       FROM customer_allergies ca 
       JOIN allergies a ON ca.allergy_id = a.id 
       WHERE ca.customer_id = ?`,
      [customer.id]
    );

    // Fetch their dietary preferences
    const preferences = await db.query(
      `SELECT dp.id, dp.preference_name, dp.forbidden_ingredients 
       FROM customer_preferences cp 
       JOIN dietary_preferences dp ON cp.preference_id = dp.id 
       WHERE cp.customer_id = ?`,
      [customer.id]
    );

    customer.allergies = allergies;
    customer.preferences = preferences;

    return res.json({
      success: true,
      data: customer
    });
  } catch (err) {
    console.error('Error during phone lookup:', err);
    return res.status(500).json({ success: false, message: 'Server error during customer lookup.' });
  }
};
