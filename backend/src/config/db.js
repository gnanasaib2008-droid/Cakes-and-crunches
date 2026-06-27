const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, '../../database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection failed:', err.message);
  } else {
    console.log('Connected to the SQLite database at:', dbPath);
  }
});

db.on('open', () => {
  db.run('PRAGMA foreign_keys = ON');
});

// Helper wrapper functions to use Promises
const dbHelper = {
  query: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },
  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  },
  exec: (sql) => {
    return new Promise((resolve, reject) => {
      db.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
};

// Database Initialization & Seeding
const initDatabase = async () => {
  try {
    // Enable Foreign Keys
    await dbHelper.run('PRAGMA foreign_keys = ON');

    // Create Tables
    await dbHelper.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'staff')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        address TEXT,
        dob TEXT,
        notes TEXT,
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS allergies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        allergy_name TEXT NOT NULL UNIQUE,
        severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high', 'critical')),
        description TEXT,
        trigger_ingredients TEXT
      );

      CREATE TABLE IF NOT EXISTS dietary_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        preference_name TEXT NOT NULL UNIQUE,
        forbidden_ingredients TEXT
      );

      CREATE TABLE IF NOT EXISTS customer_allergies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        allergy_id INTEGER NOT NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        FOREIGN KEY (allergy_id) REFERENCES allergies(id) ON DELETE CASCADE,
        UNIQUE(customer_id, allergy_id)
      );

      CREATE TABLE IF NOT EXISTS customer_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        preference_id INTEGER NOT NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        FOREIGN KEY (preference_id) REFERENCES dietary_preferences(id) ON DELETE CASCADE,
        UNIQUE(customer_id, preference_id)
      );

      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        product_name TEXT NOT NULL,
        category TEXT,
        ingredients TEXT,
        quantity INTEGER DEFAULT 1,
        order_date TEXT,
        delivery_date TEXT,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'delivered', 'cancelled')),
        notes TEXT,
        risk_score INTEGER DEFAULT 0,
        risk_explanation TEXT,
        approved_by_admin INTEGER DEFAULT 0,
        unit_price REAL DEFAULT 0,
        total_price REAL DEFAULT 0,
        baker_signature TEXT,
        baker_signed_at TEXT,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        order_id INTEGER,
        alert_type TEXT NOT NULL CHECK(alert_type IN ('allergy_conflict', 'critical_risk', 'missing_info', 'expiring_record')),
        severity TEXT NOT NULL CHECK(severity IN ('info', 'warning', 'critical')),
        message TEXT NOT NULL,
        status TEXT DEFAULT 'unread' CHECK(status IN ('unread', 'read')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        user_name TEXT,
        action TEXT NOT NULL,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Safe migration for existing tables to add unit_price and total_price
    try {
      await dbHelper.run('ALTER TABLE orders ADD COLUMN unit_price REAL DEFAULT 0');
    } catch (e) {
      // column already exists
    }
    try {
      await dbHelper.run('ALTER TABLE orders ADD COLUMN total_price REAL DEFAULT 0');
    } catch (e) {
      // column already exists
    }

    try {
      await dbHelper.run('ALTER TABLE dietary_preferences ADD COLUMN forbidden_ingredients TEXT');
    } catch (e) {
      // column already exists
    }

    try {
      await dbHelper.run('ALTER TABLE orders ADD COLUMN baker_signature TEXT');
    } catch (e) {
      // column already exists
    }

    try {
      await dbHelper.run('ALTER TABLE orders ADD COLUMN baker_signed_at TEXT');
    } catch (e) {
      // column already exists
    }

    // Create Indexes
    await dbHelper.exec(`
      CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON orders(delivery_date);
      CREATE INDEX IF NOT EXISTS idx_alerts_customer_id ON alerts(customer_id);
      CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
    `);

    // Seed default users
    const adminExists = await dbHelper.get('SELECT * FROM users WHERE email = ?', ['admin@cakesandcrunches.com']);
    if (!adminExists) {
      const hashedAdminPassword = await bcrypt.hash('AdminPass123!', 10);
      await dbHelper.run(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        ['System Admin', 'admin@cakesandcrunches.com', hashedAdminPassword, 'admin']
      );
      console.log('Seeded default admin user: admin@cakesandcrunches.com');
    }

    const staffExists = await dbHelper.get('SELECT * FROM users WHERE email = ?', ['staff@cakesandcrunches.com']);
    if (!staffExists) {
      const hashedStaffPassword = await bcrypt.hash('StaffPass123!', 10);
      await dbHelper.run(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        ['Cake Decorator Staff', 'staff@cakesandcrunches.com', hashedStaffPassword, 'staff']
      );
      console.log('Seeded default staff user: staff@cakesandcrunches.com');
    }

    const gnanasaibExists = await dbHelper.get('SELECT * FROM users WHERE email = ?', ['gnanasaib2008@gmail.com']);
    if (!gnanasaibExists) {
      const hashedPass = await bcrypt.hash('Gnanasai@2008', 10);
      await dbHelper.run(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        ['Gnana Sai', 'gnanasaib2008@gmail.com', hashedPass, 'admin']
      );
      console.log('Seeded user: gnanasaib2008@gmail.com');
    }

    // Seed allergies
    const allergyCount = await dbHelper.get('SELECT COUNT(*) as count FROM allergies');
    if (allergyCount.count === 0) {
      const initialAllergies = [
        { name: 'Peanut', severity: 'critical', trigger: 'peanut, arachis, peanut butter, monkey nut, groundnut, valencia', desc: 'Severe peanut allergy. Exposure can trigger anaphylaxis.' },
        { name: 'Gluten', severity: 'high', trigger: 'wheat, barley, rye, flour, semolina, spelt, gluten, graham, farina', desc: 'Gluten intolerance or Celiac disease. Avoid wheat flour.' },
        { name: 'Dairy', severity: 'high', trigger: 'milk, butter, cheese, whey, casein, cream, lactose, yogurt, ghee, buttermilk', desc: 'Lactose intolerance or milk protein allergy.' },
        { name: 'Egg', severity: 'high', trigger: 'egg, albumen, yolk, ovalbumin, egg powder, meringue', desc: 'Egg allergy. Check all baking agents.' },
        { name: 'Soy', severity: 'medium', trigger: 'soy, soya, soybean, lecithin, tofu, edamame', desc: 'Soy lecithin or soy flour allergy.' },
        { name: 'Tree Nuts', severity: 'critical', trigger: 'almond, walnut, cashew, pecan, pistachio, hazelnut, macadamia, brazil nut, chestnut, filbert', desc: 'Allergy to nuts grown on trees. High anaphylaxis risk.' },
        { name: 'Sesame', severity: 'medium', trigger: 'sesame, tahini, benne, sesamol', desc: 'Sesame seed allergy.' },
        { name: 'Strawberries', severity: 'medium', trigger: 'strawberry, strawberries', desc: 'Allergic reactions to fresh strawberries or strawberry puree.' }
      ];

      for (const item of initialAllergies) {
        await dbHelper.run(
          'INSERT INTO allergies (allergy_name, severity, description, trigger_ingredients) VALUES (?, ?, ?, ?)',
          [item.name, item.severity, item.desc, item.trigger]
        );
      }
      console.log('Seeded initial allergy categories');
    }

    // Seed dietary preferences
    const prefCount = await dbHelper.get('SELECT COUNT(*) as count FROM dietary_preferences');
    if (prefCount.count === 0) {
      const preferences = [
        { name: 'Vegetarian', forbidden: 'gelatin, lard, suet, animal fat' },
        { name: 'Vegan', forbidden: 'milk, butter, egg, gelatin, honey, cream, cheese, yogurt, whey, casein, lactose' },
        { name: 'Jain', forbidden: 'potato, onion, garlic, carrot, radish, beetroot, ginger, root, egg, gelatin' },
        { name: 'Gluten-Free', forbidden: 'wheat, flour, barley, rye, semolina, spelt, gluten, graham, farina' },
        { name: 'Sugar-Free', forbidden: 'sugar, honey, syrup, molasses, agave, sucrose, fructose' },
        { name: 'Dairy-Free', forbidden: 'milk, butter, cream, cheese, yogurt, whey, casein, lactose, ghee, buttermilk' },
        { name: 'Eggless', forbidden: 'egg, albumen, yolk, ovalbumin, egg powder, meringue' },
        { name: 'Keto', forbidden: 'sugar, honey, flour, wheat, potato, starch, rice' },
        { name: 'Halal', forbidden: 'alcohol, pork, gelatin, lard, bacon' }
      ];

      for (const item of preferences) {
        await dbHelper.run(
          'INSERT INTO dietary_preferences (preference_name, forbidden_ingredients) VALUES (?, ?)',
          [item.name, item.forbidden]
        );
      }
      console.log('Seeded dietary preferences');
    }

    // Update existing preferences if they don't have forbidden_ingredients set
    const defaultForbiddenList = {
      'vegetarian': 'gelatin, lard, suet, animal fat',
      'vegan': 'milk, butter, egg, gelatin, honey, cream, cheese, yogurt, whey, casein, lactose',
      'jain': 'potato, onion, garlic, carrot, radish, beetroot, ginger, root, egg, gelatin',
      'gluten-free': 'wheat, flour, barley, rye, semolina, spelt, gluten, graham, farina',
      'sugar-free': 'sugar, honey, syrup, molasses, agave, sucrose, fructose',
      'dairy-free': 'milk, butter, cream, cheese, yogurt, whey, casein, lactose, ghee, buttermilk',
      'eggless': 'egg, albumen, yolk, ovalbumin, egg powder, meringue',
      'keto': 'sugar, honey, flour, wheat, potato, starch, rice',
      'halal': 'alcohol, pork, gelatin, lard, bacon'
    };

    for (const [prefName, forbidden] of Object.entries(defaultForbiddenList)) {
      const row = await dbHelper.get('SELECT * FROM dietary_preferences WHERE LOWER(preference_name) = ?', [prefName]);
      if (!row) {
        let displayCased = prefName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-');
        displayCased = displayCased.charAt(0).toUpperCase() + displayCased.slice(1);
        await dbHelper.run(
          'INSERT INTO dietary_preferences (preference_name, forbidden_ingredients) VALUES (?, ?)',
          [displayCased, forbidden]
        );
      } else if (!row.forbidden_ingredients) {
        await dbHelper.run(
          'UPDATE dietary_preferences SET forbidden_ingredients = ? WHERE id = ?',
          [forbidden, row.id]
        );
      }
    }

    // Seed a couple of default active customers for immediate dashboard visibility
    const customerCount = await dbHelper.get('SELECT COUNT(*) as count FROM customers');
    if (customerCount.count === 0) {
      // Customer 1: John Doe (Peanut and Dairy allergy, Vegan)
      const c1 = await dbHelper.run(
        'INSERT INTO customers (name, email, phone, address, dob, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['John Doe', 'john.doe@gmail.com', '555-0199', '123 Baker St, London', '1990-05-15', 'Frequent customer, prefers high-end decorations.', 'active']
      );
      // Customer 2: Alice Smith (Gluten allergy, Jain preference)
      const c2 = await dbHelper.run(
        'INSERT INTO customers (name, email, phone, address, dob, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['Alice Smith', 'alice.smith@yahoo.com', '555-0245', '456 Crumb Ave, Oxford', '1985-11-22', 'Enjoys cupcakes, ordering for her kids.', 'active']
      );

      // Map John Doe's allergies (Peanut, Dairy)
      const peanut = await dbHelper.get("SELECT id FROM allergies WHERE allergy_name = 'Peanut'");
      const dairy = await dbHelper.get("SELECT id FROM allergies WHERE allergy_name = 'Dairy'");
      const gluten = await dbHelper.get("SELECT id FROM allergies WHERE allergy_name = 'Gluten'");

      if (peanut) await dbHelper.run('INSERT INTO customer_allergies (customer_id, allergy_id) VALUES (?, ?)', [c1.id, peanut.id]);
      if (dairy) await dbHelper.run('INSERT INTO customer_allergies (customer_id, allergy_id) VALUES (?, ?)', [c1.id, dairy.id]);
      if (gluten) await dbHelper.run('INSERT INTO customer_allergies (customer_id, allergy_id) VALUES (?, ?)', [c2.id, gluten.id]);

      // Map John Doe's preferences (Vegan) and Alice Smith's (Jain, Gluten-Free)
      const vegan = await dbHelper.get("SELECT id FROM dietary_preferences WHERE preference_name = 'Vegan'");
      const jain = await dbHelper.get("SELECT id FROM dietary_preferences WHERE preference_name = 'Jain'");
      const gf = await dbHelper.get("SELECT id FROM dietary_preferences WHERE preference_name = 'Gluten-Free'");

      if (vegan) await dbHelper.run('INSERT INTO customer_preferences (customer_id, preference_id) VALUES (?, ?)', [c1.id, vegan.id]);
      if (jain) await dbHelper.run('INSERT INTO customer_preferences (customer_id, preference_id) VALUES (?, ?)', [c2.id, jain.id]);
      if (gf) await dbHelper.run('INSERT INTO customer_preferences (customer_id, preference_id) VALUES (?, ?)', [c2.id, gf.id]);

      console.log('Seeded sample customers with allergy and dietary mappings');
    }

  } catch (err) {
    console.error('Failed to initialize database:', err);
  }
};

module.exports = {
  db,
  ...dbHelper,
  initDatabase
};
