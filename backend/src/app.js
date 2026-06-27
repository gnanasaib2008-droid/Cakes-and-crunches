const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customers');
const allergyRoutes = require('./routes/allergies');
const orderRoutes = require('./routes/orders');
const dashboardRoutes = require('./routes/dashboard');
const reportsRoutes = require('./routes/reports');
const aiRoutes = require('./routes/ai');

const app = express();

// Middlewares
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve file uploads statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes mapping
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/allergies', allergyRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/ai', aiRoutes);

// Mockup Upload route
const upload = require('./middleware/upload');
app.post('/api/orders/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }
  res.json({
    success: true,
    filePath: `/uploads/${req.file.filename}`
  });
});

// Base health check
app.get('/', (req, res) => {
  res.json({ message: 'Cakes and Crunches Allergy & Dietary API is running.' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error.'
  });
});

module.exports = app;
