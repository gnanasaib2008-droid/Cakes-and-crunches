const db = require('../config/db');
const { checkOrderSafety } = require('../services/allergyEngine');
const smsService = require('../services/smsService');
const { sendEmail } = require('../services/emailService');

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

exports.getAllOrders = async (req, res) => {
  let { search, status, page, limit, sort, order } = req.query;
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;
  const offset = (page - 1) * limit;

  // Validate sort field to prevent SQL injection
  const allowedSortFields = {
    id: 'o.id',
    product_name: 'o.product_name',
    delivery_date: 'o.delivery_date',
    risk_score: 'o.risk_score',
    status: 'o.status',
    total_price: 'o.total_price',
    quantity: 'o.quantity',
    order_date: 'o.order_date'
  };

  const sortCol = allowedSortFields[sort] || 'o.id';
  const sortOrder = (order && order.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';

  let queryStr = `
    SELECT o.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone 
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (search) {
    queryStr += ' AND (c.name LIKE ? OR o.product_name LIKE ?)';
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam);
  }

  if (status) {
    queryStr += ' AND o.status = ?';
    params.push(status);
  }

  try {
    const countQuery = `
      SELECT COUNT(*) as count 
      FROM orders o 
      JOIN customers c ON o.customer_id = c.id 
      WHERE 1=1
      ${search ? 'AND (c.name LIKE ? OR o.product_name LIKE ?)' : ''}
      ${status ? 'AND o.status = ?' : ''}
    `;
    const countParams = params.slice(0, params.length);
    const totalCountRow = await db.get(countQuery, countParams);
    const total = totalCountRow ? totalCountRow.count : 0;

    queryStr += ` ORDER BY ${sortCol} ${sortOrder} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const orders = await db.query(queryStr, params);

    return res.json({
      success: true,
      data: orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Error fetching orders:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve orders.' });
  }
};

exports.getOrderById = async (req, res) => {
  const { id } = req.params;

  try {
    const order = await db.get(
      `SELECT o.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone 
       FROM orders o
       JOIN customers c ON o.customer_id = c.id
       WHERE o.id = ?`,
      [id]
    );

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    return res.json({ success: true, data: order });
  } catch (err) {
    console.error('Error fetching order by ID:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve order details.' });
  }
};

exports.createOrder = async (req, res) => {
  const { customer_id, product_name, category, ingredients, quantity, order_date, delivery_date, notes, unit_price } = req.body;

  if (!customer_id || !product_name || !ingredients) {
    return res.status(400).json({ success: false, message: 'Customer ID, product name, and ingredients are required.' });
  }

  try {
    // 1. Fetch customer details
    const customer = await db.get('SELECT name, email FROM customers WHERE id = ?', [customer_id]);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    // 2. Perform AI Safety Scan
    const safetyReport = await checkOrderSafety(customer_id, ingredients);
    const { riskScore, riskLevel, requiresApproval, explanation } = safetyReport;

    // 3. Save order to database
    // Default approved_by_admin = 0 for critical risks, otherwise 1 (no override required)
    const approvedByAdmin = requiresApproval ? 0 : 1;
    const unitPriceNum = parseFloat(unit_price) || 0;
    const qtyNum = parseInt(quantity) || 1;
    const totalPrice = unitPriceNum * qtyNum;

    const result = await db.run(
      `INSERT INTO orders (customer_id, product_name, category, ingredients, quantity, order_date, delivery_date, status, notes, risk_score, risk_explanation, approved_by_admin, unit_price, total_price) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)`,
      [
        customer_id,
        product_name,
        category || 'Cake',
        ingredients,
        qtyNum,
        order_date || new Date().toISOString(),
        delivery_date,
        notes || '',
        riskScore,
        explanation,
        approvedByAdmin,
        unitPriceNum,
        totalPrice
      ]
    );

    const orderId = result.id;

    // 4. Create Alert records and send emails
    if (riskScore > 0) {
      let alertSeverity = 'info';
      let alertType = 'allergy_conflict';

      if (riskLevel === 'critical') {
        alertSeverity = 'critical';
        alertType = 'critical_risk';
      } else if (riskLevel === 'high' || riskLevel === 'medium') {
        alertSeverity = 'warning';
        alertType = 'allergy_conflict';
      }

      // Record alert in Alert Center
      await db.run(
        `INSERT INTO alerts (customer_id, order_id, alert_type, severity, message) 
         VALUES (?, ?, ?, ?, ?)`,
        [customer_id, orderId, alertType, alertSeverity, explanation]
      );

      // Email warning notification to admin/staff
      const subject = `⚠️ Cakes & Crunches Safety Alert: ${riskLevel.toUpperCase()} Risk Order #${orderId}`;
      const text = `Safety Alert for Order #${orderId} (${product_name}) for customer ${customer.name}.\nRisk Score: ${riskScore}%\nDetails: ${explanation}`;
      const html = `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
          <h2 style="color: ${riskLevel === 'critical' ? '#e11d48' : '#d97706'};">⚠️ Safety Engine Alert: ${riskLevel.toUpperCase()} Risk</h2>
          <p>An order has been flagged with a <strong>${riskScore}%</strong> risk score.</p>
          <hr style="border: 0; border-top: 1px solid #eee;" />
          <p><strong>Customer:</strong> ${customer.name}</p>
          <p><strong>Product:</strong> ${product_name} (${category || 'Cake'})</p>
          <p><strong>Order ID:</strong> #${orderId}</p>
          <p><strong>Risk Explanation:</strong> ${explanation}</p>
          <p style="margin-top: 20px; font-size: 13px; color: #666;">
            ${requiresApproval ? '🚨 This order is currently <strong>BLOCKED</strong> and requires Administrator approval in the Alert Center before baking.' : 'This order has been recorded with warnings. Staff confirmation suggested.'}
          </p>
        </div>
      `;

      // Trigger email dispatch (mocked in console unless SMTP details are loaded)
      await sendEmail(customer.email || 'manager@cakesandcrunches.com', subject, text, html);
    }

    await logActivity(
      req.user?.id || null,
      req.user?.name || 'Online Customer',
      'ORDER_CREATE',
      `Placed order #${orderId} (${product_name}) for ${customer.name}. Risk Level: ${riskLevel} (${riskScore}%)`
    );

    // Emit Socket.io event for real-time KDS update
    const io = req.app.get('io');
    if (io) {
      io.emit('order_created', {
        id: orderId,
        customer_id,
        customer_name: customer.name,
        product_name,
        risk_score: riskScore,
        risk_level: riskLevel,
        status: 'pending'
      });
    }

    return res.status(201).json({
      success: true,
      message: requiresApproval
        ? '⚠️ Order created but blocked due to critical allergy conflict. Requires Admin approval.'
        : 'Order created successfully.',
      orderId,
      safetyReport
    });
  } catch (err) {
    console.error('Error creating order:', err);
    return res.status(500).json({ success: false, message: 'Server error while processing order.' });
  }
};

exports.approveOrder = async (req, res) => {
  const { id } = req.params;

  try {
    const order = await db.get(
      `SELECT o.*, c.name as customer_name 
       FROM orders o
       JOIN customers c ON o.customer_id = c.id
       WHERE o.id = ?`,
      [id]
    );

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    await db.run('UPDATE orders SET approved_by_admin = 1 WHERE id = ?', [id]);

    // Mark any corresponding critical alerts as read/dismissed
    await db.run(
      "UPDATE alerts SET status = 'read' WHERE order_id = ? AND alert_type = 'critical_risk'",
      [id]
    );

    await logActivity(
      req.user.id,
      req.user.name,
      'ORDER_APPROVE_OVERRIDE',
      `Admin approved critical risk order #${id} for customer ${order.customer_name}`
    );

    // Emit Socket.io event for real-time KDS update
    const io = req.app.get('io');
    if (io) {
      io.emit('order_updated', {
        id: parseInt(id),
        action: 'approved'
      });
    }

    return res.json({ success: true, message: 'Order has been approved for baking.' });
  } catch (err) {
    console.error('Error approving order:', err);
    return res.status(500).json({ success: false, message: 'Failed to approve order.' });
  }
};

exports.updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['pending', 'in_progress', 'completed', 'delivered', 'cancelled'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid or missing status.' });
  }

  try {
    const order = await db.get('SELECT approved_by_admin, product_name, status, customer_id, risk_score FROM orders WHERE id = ?', [id]);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    // Block moving to in_progress or completed if not approved
    if (order.approved_by_admin === 0 && (status === 'in_progress' || status === 'completed')) {
      return res.status(400).json({
        success: false,
        message: 'Cannot process order. Critical allergy risk requires Administrator approval.'
      });
    }

    // Enforce Baker Double-Signature sign-off for high-risk (risk_score >= 80) orders
    if (order.risk_score >= 80 && (status === 'completed' || status === 'delivered')) {
      const { baker_signature } = req.body;
      if (!baker_signature || !baker_signature.trim()) {
        return res.status(400).json({
          success: false,
          requiresBakerSignature: true,
          message: 'Double-Signature Required: Final baker safety verification signature is required for high-risk allergen orders.'
        });
      }

      await db.run(
        'UPDATE orders SET baker_signature = ?, baker_signed_at = ? WHERE id = ?',
        [baker_signature.trim(), new Date().toISOString(), id]
      );
    }

    await db.run('UPDATE orders SET status = ? WHERE id = ?', [status, id]);

    // Fetch customer profile details
    const customer = await db.get('SELECT name, phone, email FROM customers WHERE id = ?', [order.customer_id]);

    // 1. Send SMS alert to customer via Twilio Service
    if (customer && customer.phone) {
      const messageBody = `Hi ${customer.name}, your Cakes & Crunches order #${id} (${order.product_name}) status has changed to: ${status.toUpperCase()}!`;
      await smsService.sendSMS(customer.phone, messageBody);
    }

    // 2. Send Email alert to customer
    if (customer && customer.email) {
      const emailSubject = `🍰 Cakes & Crunches: Order #${id} Status Updated to ${status.toUpperCase()}`;
      const emailText = `Hi ${customer.name},\n\nYour order #${id} (${order.product_name}) status has changed to: ${status.toUpperCase()}.\n\nThank you for choosing Cakes & Crunches!`;
      const emailHtml = `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px; max-width: 600px; background-color: #faf5ff;">
          <h2 style="color: #6d28d9; margin-top: 0;">🍰 Cakes & Crunches Order Update</h2>
          <p>Hi <strong>${customer.name}</strong>,</p>
          <p>Your custom cake order status has been updated!</p>
          <div style="background-color: #ffffff; padding: 15px; border-radius: 6px; border-left: 4px solid #8b5cf6; margin: 15px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Order ID:</strong> #${id}</p>
            <p style="margin: 0 0 8px 0;"><strong>Product:</strong> ${order.product_name}</p>
            <p style="margin: 0;"><strong>New Status:</strong> <span style="text-transform: uppercase; font-weight: bold; color: #7c3aed;">${status}</span></p>
          </div>
          <p>We are preparing everything according to your specified allergy and safety requirements.</p>
          <hr style="border: 0; border-top: 1px solid #e9d5ff; margin: 20px 0;" />
          <p style="font-size: 11px; color: #a21caf;">This is an automated status update notification from Cakes & Crunches Bakery.</p>
        </div>
      `;
      await sendEmail(customer.email, emailSubject, emailText, emailHtml);
    }

    await logActivity(
      req.user.id,
      req.user.name,
      'ORDER_STATUS_UPDATE',
      `Changed order #${id} (${order.product_name}) status from "${order.status}" to "${status}"`
    );

    // Emit Socket.io event for real-time KDS update
    const io = req.app.get('io');
    if (io) {
      io.emit('order_updated', {
        id: parseInt(id),
        status,
        action: 'status_changed'
      });
    }

    return res.json({ success: true, message: `Order status updated to ${status}.` });
  } catch (err) {
    console.error('Error updating order status:', err);
    return res.status(500).json({ success: false, message: 'Failed to update order status.' });
  }
};

exports.updateOrder = async (req, res) => {
  const { id } = req.params;
  const { product_name, category, ingredients, quantity, delivery_date, notes, unit_price } = req.body;

  if (!product_name || !ingredients) {
    return res.status(400).json({ success: false, message: 'Product name and ingredients are required.' });
  }

  try {
    const order = await db.get('SELECT customer_id, quantity, unit_price FROM orders WHERE id = ?', [id]);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const qtyNum = parseInt(quantity) || order.quantity;
    const unitPriceNum = unit_price !== undefined ? parseFloat(unit_price) || 0 : order.unit_price;
    const totalPrice = unitPriceNum * qtyNum;

    // Perform safety check again in case ingredients changed
    const safetyReport = await checkOrderSafety(order.customer_id, ingredients);
    const { riskScore, riskLevel, requiresApproval, explanation } = safetyReport;

    const approvedByAdmin = requiresApproval ? 0 : 1;

    await db.run(
      `UPDATE orders 
       SET product_name = ?, category = ?, ingredients = ?, quantity = ?, delivery_date = ?, notes = ?, unit_price = ?, total_price = ?, risk_score = ?, risk_explanation = ?, approved_by_admin = ?
       WHERE id = ?`,
      [
        product_name,
        category || 'Cake',
        ingredients,
        qtyNum,
        delivery_date,
        notes || '',
        unitPriceNum,
        totalPrice,
        riskScore,
        explanation,
        approvedByAdmin,
        id
      ]
    );

    // Update alert status if severity changed
    if (riskScore === 0) {
      await db.run("DELETE FROM alerts WHERE order_id = ?", [id]);
    } else {
      let alertSeverity = 'info';
      let alertType = 'allergy_conflict';

      if (riskLevel === 'critical') {
        alertSeverity = 'critical';
        alertType = 'critical_risk';
      } else if (riskLevel === 'high' || riskLevel === 'medium') {
        alertSeverity = 'warning';
        alertType = 'allergy_conflict';
      }

      const existingAlert = await db.get("SELECT id FROM alerts WHERE order_id = ?", [id]);
      if (existingAlert) {
        await db.run(
          "UPDATE alerts SET severity = ?, alert_type = ?, message = ?, status = 'unread' WHERE order_id = ?",
          [alertSeverity, alertType, explanation, id]
        );
      } else {
        await db.run(
          "INSERT INTO alerts (customer_id, order_id, alert_type, severity, message) VALUES (?, ?, ?, ?, ?)",
          [order.customer_id, id, alertType, alertSeverity, explanation]
        );
      }
    }

    await logActivity(
      req.user.id,
      req.user.name,
      'ORDER_UPDATE',
      `Updated order #${id} (${product_name}). Risk Level: ${riskLevel} (${riskScore}%)`
    );

    // Emit Socket.io event for real-time KDS update
    const io = req.app.get('io');
    if (io) {
      io.emit('order_updated', {
        id: parseInt(id),
        product_name,
        category,
        ingredients,
        quantity: qtyNum,
        risk_score: riskScore,
        risk_level: riskLevel,
        action: 'modified'
      });
    }

    return res.json({
      success: true,
      message: requiresApproval
        ? '⚠️ Order updated but blocked due to critical allergy conflict. Requires Admin approval.'
        : 'Order updated successfully.',
      safetyReport
    });
  } catch (err) {
    console.error('Error updating order:', err);
    return res.status(500).json({ success: false, message: 'Failed to update order.' });
  }
};

exports.deleteOrder = async (req, res) => {
  const { id } = req.params;

  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied. Administrator privileges required.' });
  }

  try {
    const order = await db.get('SELECT product_name FROM orders WHERE id = ?', [id]);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    await db.run('DELETE FROM orders WHERE id = ?', [id]);
    await db.run('DELETE FROM alerts WHERE order_id = ?', [id]);

    await logActivity(
      req.user.id,
      req.user.name,
      'ORDER_DELETE',
      `Deleted order #${id} (${order.product_name})`
    );

    // Emit Socket.io event for real-time KDS update
    const io = req.app.get('io');
    if (io) {
      io.emit('order_deleted', {
        id: parseInt(id)
      });
    }

    return res.json({ success: true, message: 'Order deleted successfully.' });
  } catch (err) {
    console.error('Error deleting order:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete order.' });
  }
};
