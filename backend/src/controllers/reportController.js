const db = require('../config/db');

// Helper to escape CSV fields
const escapeCSV = (val) => {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

// Compile Report Data
exports.getReportData = async (req, res) => {
  const { type, start_date, end_date, sort, order } = req.query;

  try {
    let reportData = [];

    switch (type) {
      case 'customers': {
        let filterClause = ' WHERE 1=1';
        const params = [];
        if (start_date) {
          filterClause += ' AND date(c.created_at) >= date(?)';
          params.push(start_date);
        }
        if (end_date) {
          filterClause += ' AND date(c.created_at) <= date(?)';
          params.push(end_date);
        }
        const allowedSort = {
          id: 'c.id',
          name: 'c.name',
          email: 'c.email',
          phone: 'c.phone',
          status: 'c.status',
          created_at: 'c.created_at',
          allergy_count: 'allergy_count',
          preference_count: 'preference_count'
        };
        const sortCol = allowedSort[sort] || 'c.name';
        const sortOrder = order === 'desc' ? 'DESC' : 'ASC';

        reportData = await db.query(`
          SELECT c.id, c.name, c.email, c.phone, c.status, c.created_at,
                 (SELECT COUNT(*) FROM customer_allergies WHERE customer_id = c.id) as allergy_count,
                 (SELECT COUNT(*) FROM customer_preferences WHERE customer_id = c.id) as preference_count
          FROM customers c
          ${filterClause}
          ORDER BY ${sortCol} ${sortOrder}
        `, params);
        break;
      }

      case 'allergies': {
        const allowedSort = {
          id: 'a.id',
          allergy_name: 'a.allergy_name',
          severity: 'a.severity',
          customer_count: 'customer_count'
        };
        const sortCol = allowedSort[sort] || 'customer_count';
        const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

        reportData = await db.query(`
          SELECT a.id, a.allergy_name, a.severity, a.trigger_ingredients,
                 (SELECT COUNT(*) FROM customer_allergies WHERE allergy_id = a.id) as customer_count
          FROM allergies a
          ORDER BY ${sortCol} ${sortOrder}, a.allergy_name ASC
        `);
        break;
      }

      case 'dietary': {
        const allowedSort = {
          id: 'dp.id',
          preference_name: 'dp.preference_name',
          customer_count: 'customer_count'
        };
        const sortCol = allowedSort[sort] || 'customer_count';
        const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

        reportData = await db.query(`
          SELECT dp.id, dp.preference_name,
                 (SELECT COUNT(*) FROM customer_preferences WHERE preference_id = dp.id) as customer_count
          FROM dietary_preferences dp
          ORDER BY ${sortCol} ${sortOrder}
        `);
        break;
      }

      case 'orders': {
        let filterClause = ' WHERE 1=1';
        const params = [];
        if (start_date) {
          filterClause += ' AND date(o.order_date) >= date(?)';
          params.push(start_date);
        }
        if (end_date) {
          filterClause += ' AND date(o.order_date) <= date(?)';
          params.push(end_date);
        }
        const allowedSort = {
          id: 'o.id',
          product_name: 'o.product_name',
          category: 'o.category',
          quantity: 'o.quantity',
          order_date: 'o.order_date',
          delivery_date: 'o.delivery_date',
          status: 'o.status',
          risk_score: 'o.risk_score',
          customer_name: 'customer_name'
        };
        const sortCol = allowedSort[sort] || 'o.order_date';
        const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

        reportData = await db.query(`
          SELECT o.id, o.product_name, o.category, o.ingredients, o.quantity, o.order_date, o.delivery_date, o.status, o.risk_score, o.approved_by_admin,
                 c.name as customer_name
          FROM orders o
          JOIN customers c ON o.customer_id = c.id
          ${filterClause}
          ORDER BY ${sortCol} ${sortOrder}
        `, params);
        break;
      }

      case 'risk': {
        let filterClause = " WHERE action IN ('ORDER_APPROVE_OVERRIDE', 'ORDER_CREATE', 'ALLERGY_CREATE', 'ALLERGY_DELETE')";
        const params = [];
        if (start_date) {
          filterClause += ' AND date(created_at) >= date(?)';
          params.push(start_date);
        }
        if (end_date) {
          filterClause += ' AND date(created_at) <= date(?)';
          params.push(end_date);
        }
        const allowedSort = {
          id: 'id',
          user_name: 'user_name',
          action: 'action',
          created_at: 'created_at'
        };
        const sortCol = allowedSort[sort] || 'created_at';
        const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

        reportData = await db.query(`
          SELECT id, user_name, action, details, created_at 
          FROM audit_logs 
          ${filterClause}
          ORDER BY ${sortCol} ${sortOrder}
        `, params);
        break;
      }

      default:
        return res.status(400).json({ success: false, message: 'Invalid report type specified.' });
    }

    return res.json({ success: true, data: reportData });
  } catch (err) {
    console.error('Error creating report data:', err);
    return res.status(500).json({ success: false, message: 'Failed to compile report data.' });
  }
};

// CSV Export Endpoint
exports.exportCSV = async (req, res) => {
  const { type } = req.params;
  const { start_date, end_date, sort, order } = req.query;

  try {
    let csvContent = '';
    let filename = `report_${type}_${Date.now()}.csv`;

    if (type === 'customers') {
      let filterClause = ' WHERE 1=1';
      const params = [];
      if (start_date) {
        filterClause += ' AND date(c.created_at) >= date(?)';
        params.push(start_date);
      }
      if (end_date) {
        filterClause += ' AND date(c.created_at) <= date(?)';
        params.push(end_date);
      }
      const allowedSort = {
        id: 'c.id',
        name: 'c.name',
        email: 'c.email',
        phone: 'c.phone',
        status: 'c.status',
        created_at: 'c.created_at'
      };
      const sortCol = allowedSort[sort] || 'c.name';
      const sortOrder = order === 'desc' ? 'DESC' : 'ASC';

      const data = await db.query(`
        SELECT c.id, c.name, c.email, c.phone, c.address, c.dob, c.status, c.created_at,
               (SELECT COUNT(*) FROM customer_allergies WHERE customer_id = c.id) as allergy_count
        FROM customers c
        ${filterClause}
        ORDER BY ${sortCol} ${sortOrder}
      `, params);
      csvContent += 'Customer ID,Name,Email,Phone,Address,Date of Birth,Status,Created Date,Allergy Count\n';
      data.forEach(r => {
        csvContent += `${r.id},${escapeCSV(r.name)},${escapeCSV(r.email)},${escapeCSV(r.phone)},${escapeCSV(r.address)},${escapeCSV(r.dob)},${escapeCSV(r.status)},${escapeCSV(r.created_at)},${r.allergy_count}\n`;
      });

    } else if (type === 'allergies') {
      const allowedSort = {
        id: 'a.id',
        allergy_name: 'a.allergy_name',
        severity: 'a.severity',
        customer_count: 'customer_count'
      };
      const sortCol = allowedSort[sort] || 'customer_count';
      const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

      const data = await db.query(`
        SELECT a.id, a.allergy_name, a.severity, a.trigger_ingredients,
               (SELECT COUNT(*) FROM customer_allergies WHERE allergy_id = a.id) as customer_count
        FROM allergies a
        ORDER BY ${sortCol} ${sortOrder}, a.allergy_name ASC
      `);
      csvContent += 'Allergy ID,Allergy Name,Severity,Trigger Ingredients,Customer Count\n';
      data.forEach(r => {
        csvContent += `${r.id},${escapeCSV(r.allergy_name)},${escapeCSV(r.severity)},${escapeCSV(r.trigger_ingredients)},${r.customer_count}\n`;
      });

    } else if (type === 'orders') {
      let filterClause = ' WHERE 1=1';
      const params = [];
      if (start_date) {
        filterClause += ' AND date(o.order_date) >= date(?)';
        params.push(start_date);
      }
      if (end_date) {
        filterClause += ' AND date(o.order_date) <= date(?)';
        params.push(end_date);
      }
      const allowedSort = {
        id: 'o.id',
        product_name: 'o.product_name',
        category: 'o.category',
        quantity: 'o.quantity',
        order_date: 'o.order_date',
        delivery_date: 'o.delivery_date',
        status: 'o.status',
        risk_score: 'o.risk_score'
      };
      const sortCol = allowedSort[sort] || 'o.order_date';
      const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

      const data = await db.query(`
        SELECT o.id, c.name as customer_name, o.product_name, o.category, o.ingredients, o.quantity, o.order_date, o.delivery_date, o.status, o.risk_score, o.approved_by_admin
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        ${filterClause}
        ORDER BY ${sortCol} ${sortOrder}
      `, params);
      csvContent += 'Order ID,Customer Name,Product,Category,Ingredients,Quantity,Order Date,Delivery Date,Status,Risk Score,Admin Approved\n';
      data.forEach(r => {
        csvContent += `${r.id},${escapeCSV(r.customer_name)},${escapeCSV(r.product_name)},${escapeCSV(r.category)},${escapeCSV(r.ingredients)},${r.quantity},${escapeCSV(r.order_date)},${escapeCSV(r.delivery_date)},${escapeCSV(r.status)},${r.risk_score},${r.approved_by_admin ? 'Yes' : 'No'}\n`;
      });

    } else if (type === 'risk') {
      let filterClause = " WHERE action IN ('ORDER_APPROVE_OVERRIDE', 'ORDER_CREATE')";
      const params = [];
      if (start_date) {
        filterClause += ' AND date(created_at) >= date(?)';
        params.push(start_date);
      }
      if (end_date) {
        filterClause += ' AND date(created_at) <= date(?)';
        params.push(end_date);
      }
      const allowedSort = {
        id: 'id',
        user_name: 'user_name',
        action: 'action',
        created_at: 'created_at'
      };
      const sortCol = allowedSort[sort] || 'created_at';
      const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

      const data = await db.query(`
        SELECT id, user_name, action, details, created_at 
        FROM audit_logs 
        ${filterClause}
        ORDER BY ${sortCol} ${sortOrder}
      `, params);
      csvContent += 'Audit Log ID,Triggered By,Action Type,Details,Timestamp\n';
      data.forEach(r => {
        csvContent += `${r.id},${escapeCSV(r.user_name)},${escapeCSV(r.action)},${escapeCSV(r.details)},${escapeCSV(r.created_at)}\n`;
      });

    } else {
      return res.status(400).json({ success: false, message: 'Invalid CSV export type.' });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvContent);

  } catch (err) {
    console.error('CSV export failed:', err);
    return res.status(500).json({ success: false, message: 'CSV file generation failed.' });
  }
};

// Activity logs general audit
exports.getAuditLogs = async (req, res) => {
  try {
    const logs = await db.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100');
    return res.json({ success: true, data: logs });
  } catch (err) {
    console.error('Error loading audit logs:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve audit log details.' });
  }
};
