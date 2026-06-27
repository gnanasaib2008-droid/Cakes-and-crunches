const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth');

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

exports.register = async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  if (role !== 'admin' && role !== 'staff') {
    return res.status(400).json({ success: false, message: 'Invalid role. Choose admin or staff.' });
  }

  try {
    const userExists = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.run(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, role]
    );

    await logActivity(result.id, name, 'USER_REGISTER', `Created user account with role: ${role}`);

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      user: { id: result.id, name, email, role }
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  try {
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    await logActivity(user.id, user.name, 'USER_LOGIN', 'Logged into the application');

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await db.get('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    return res.json({ success: true, user });
  } catch (err) {
    console.error('getMe error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required.' });
  }

  try {
    const user = await db.get('SELECT id, name FROM users WHERE email = ?', [email]);
    if (!user) {
      // Return 200 for security reasons but do nothing
      return res.json({ success: true, message: 'If that email exists, we have sent instructions to reset the password.' });
    }

    // Mock reset token
    const resetToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '15m' });
    console.log(`[Forgot Password] Reset link created: http://localhost:5173/reset-password?token=${resetToken}`);

    await logActivity(user.id, user.name, 'FORGOT_PASSWORD_REQUEST', 'Requested a password reset link');

    return res.json({
      success: true,
      message: 'Password reset link sent (Simulated). Check backend terminal output.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ success: false, message: 'Token and new password are required.' });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const user = await db.get('SELECT name FROM users WHERE id = ?', [verified.id]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    await db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, verified.id]);
    await logActivity(verified.id, user.name, 'PASSWORD_RESET', 'Successfully reset account password');

    return res.json({ success: true, message: 'Password has been reset successfully.' });
  } catch (err) {
    return res.status(400).json({ success: false, message: 'Invalid or expired reset token.' });
  }
};
