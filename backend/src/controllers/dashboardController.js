const db = require('../config/db');

exports.getSummary = async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    // KPI 1: Total Customers
    const totalCustRow = await db.get('SELECT COUNT(*) as count FROM customers');
    const totalCustomers = totalCustRow ? totalCustRow.count : 0;

    // KPI 2: Active Customers
    const activeCustRow = await db.get("SELECT COUNT(*) as count FROM customers WHERE status = 'active'");
    const activeCustomers = activeCustRow ? activeCustRow.count : 0;

    // KPI 3: High Risk Allergy Customers (those with High or Critical severity allergies)
    const highRiskRow = await db.get(`
      SELECT COUNT(DISTINCT ca.customer_id) as count 
      FROM customer_allergies ca 
      JOIN allergies a ON ca.allergy_id = a.id 
      WHERE a.severity IN ('high', 'critical')
    `);
    const highRiskCustomers = highRiskRow ? highRiskRow.count : 0;

    // KPI 4: Today's Orders
    const todayOrdersRow = await db.get('SELECT COUNT(*) as count FROM orders WHERE order_date = ?', [todayStr]);
    const todayOrders = todayOrdersRow ? todayOrdersRow.count : 0;

    // KPI 5: Weekly Orders
    const weeklyOrdersRow = await db.get('SELECT COUNT(*) as count FROM orders WHERE order_date >= ?', [sevenDaysAgoStr]);
    const weeklyOrders = weeklyOrdersRow ? weeklyOrdersRow.count : 0;

    // KPI 6: Allergy Alerts (Unread counts)
    const alertsRow = await db.get("SELECT COUNT(*) as count FROM alerts WHERE status = 'unread'");
    const allergyAlerts = alertsRow ? alertsRow.count : 0;

    // KPI 7: Revenue Summary (Estimated: assuming average order price of $45 per quantity unit)
    const revenueRow = await db.get('SELECT SUM(quantity) as totalQty FROM orders WHERE status != ?', ['cancelled']);
    const totalQty = revenueRow ? (revenueRow.totalQty || 0) : 0;
    const revenueSummary = totalQty * 45; // $45.00 average cake/dessert price

    // --- Chart Data Queries ---

    // Chart 1: Allergy Distribution
    const allergyDistribution = await db.query(`
      SELECT a.allergy_name as name, COUNT(ca.id) as value 
      FROM customer_allergies ca 
      JOIN allergies a ON ca.allergy_id = a.id 
      GROUP BY a.allergy_name 
      ORDER BY value DESC
    `);

    // Chart 2: Dietary Preferences Statistics
    const dietaryStats = await db.query(`
      SELECT dp.preference_name as name, COUNT(cp.id) as value 
      FROM customer_preferences cp 
      JOIN dietary_preferences dp ON cp.preference_id = dp.id 
      GROUP BY dp.preference_name 
      ORDER BY value DESC
    `);

    // Chart 3: Monthly Orders (Grouped by month of the last 6 months)
    const monthlyOrders = await db.query(`
      SELECT substr(order_date, 1, 7) as month, COUNT(*) as count 
      FROM orders 
      GROUP BY month 
      ORDER BY month DESC 
      LIMIT 6
    `);
    // Reverse to show chronologically
    monthlyOrders.reverse();

    // Chart 4: Customer Growth (Last 6 months registration trends)
    const customerGrowth = await db.query(`
      SELECT substr(created_at, 1, 7) as month, COUNT(*) as count 
      FROM customers 
      GROUP BY month 
      ORDER BY month DESC 
      LIMIT 6
    `);
    customerGrowth.reverse();

    // Latest Unread Alerts Panel
    const recentAlerts = await db.query(`
      SELECT a.*, c.name as customer_name, o.product_name 
      FROM alerts a
      JOIN customers c ON a.customer_id = c.id
      LEFT JOIN orders o ON a.order_id = o.id
      ORDER BY a.created_at DESC
      LIMIT 5
    `);

    return res.json({
      success: true,
      data: {
        kpis: {
          totalCustomers,
          activeCustomers,
          highRiskCustomers,
          todayOrders,
          weeklyOrders,
          allergyAlerts,
          revenueSummary
        },
        charts: {
          allergyDistribution,
          dietaryStats,
          monthlyOrders,
          customerGrowth
        },
        recentAlerts
      }
    });
  } catch (err) {
    console.error('Error compiling dashboard summary:', err);
    return res.status(500).json({ success: false, message: 'Server error retrieving dashboard stats.' });
  }
};

exports.getAlerts = async (req, res) => {
  try {
    const alerts = await db.query(`
      SELECT a.*, c.name as customer_name, c.phone as customer_phone, o.product_name 
      FROM alerts a
      JOIN customers c ON a.customer_id = c.id
      LEFT JOIN orders o ON a.order_id = o.id
      ORDER BY a.status ASC, a.created_at DESC
    `);
    return res.json({ success: true, data: alerts });
  } catch (err) {
    console.error('Error fetching alerts:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve system alerts.' });
  }
};

exports.dismissAlert = async (req, res) => {
  const { id } = req.params;
  try {
    await db.run("UPDATE alerts SET status = 'read' WHERE id = ?", [id]);
    return res.json({ success: true, message: 'Alert dismissed.' });
  } catch (err) {
    console.error('Error dismissing alert:', err);
    return res.status(500).json({ success: false, message: 'Failed to dismiss alert.' });
  }
};

exports.getStats = async (req, res) => {
  try {
    const pendingOrdersRow = await db.get("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'");
    const unreadAlertsRow = await db.get("SELECT COUNT(*) as count FROM alerts WHERE status = 'unread'");
    return res.json({
      success: true,
      data: {
        pendingOrders: pendingOrdersRow ? pendingOrdersRow.count : 0,
        unreadAlerts: unreadAlertsRow ? unreadAlertsRow.count : 0
      }
    });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve stats.' });
  }
};
