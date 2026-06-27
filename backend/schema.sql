-- MySQL database schema for Cakes and Crunches: Customer Allergy & Dietary Preference Profile System

-- 1. Users (Auth & Roles)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'staff') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Customers
CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  dob DATE, -- YYYY-MM-DD
  notes TEXT,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Allergies
CREATE TABLE IF NOT EXISTS allergies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  allergy_name VARCHAR(100) NOT NULL UNIQUE,
  severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,
  description TEXT,
  trigger_ingredients TEXT -- Comma-separated list of triggers
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Dietary Preferences
CREATE TABLE IF NOT EXISTS dietary_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  preference_name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Customer Allergy Mapping
CREATE TABLE IF NOT EXISTS customer_allergies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  allergy_id INT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (allergy_id) REFERENCES allergies(id) ON DELETE CASCADE,
  UNIQUE KEY unique_customer_allergy (customer_id, allergy_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Customer Preference Mapping
CREATE TABLE IF NOT EXISTS customer_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  preference_id INT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (preference_id) REFERENCES dietary_preferences(id) ON DELETE CASCADE,
  UNIQUE KEY unique_customer_preference (customer_id, preference_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Orders
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  category VARCHAR(100) DEFAULT 'Cake',
  ingredients TEXT NOT NULL, -- Comma-separated list of ingredients in the specific order
  quantity INT DEFAULT 1,
  order_date DATE NOT NULL,
  delivery_date DATE,
  status ENUM('pending', 'in_progress', 'completed', 'delivered', 'cancelled') DEFAULT 'pending',
  notes TEXT,
  risk_score INT DEFAULT 0,
  risk_explanation TEXT,
  approved_by_admin TINYINT(1) DEFAULT 0, -- 1 = true, 0 = false (requires admin approval if critical)
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Alerts
CREATE TABLE IF NOT EXISTS alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  order_id INT,
  alert_type ENUM('allergy_conflict', 'critical_risk', 'missing_info', 'expiring_record') NOT NULL,
  severity ENUM('info', 'warning', 'critical') NOT NULL,
  message TEXT NOT NULL,
  status ENUM('unread', 'read') DEFAULT 'unread',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  user_name VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
