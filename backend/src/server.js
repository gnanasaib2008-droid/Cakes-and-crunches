require('dotenv').config();
const http = require('http');
const socketIo = require('socket.io');
const app = require('./app');
const { initDatabase } = require('./config/db');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Store io instance on app so it can be accessed in controllers
app.set('io', io);

io.on('connection', (socket) => {
  console.log('🔌 Client connected to KDS socket:', socket.id);
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected from KDS socket:', socket.id);
  });
});

// Initialize Database before starting the server
initDatabase().then(() => {
  server.listen(PORT, () => {
    console.log(`===================================================`);
    console.log(`🎂 Cakes and Crunches Backend Server running on port ${PORT}`);
    console.log(`🔒 Environment: Development (SQLite active + WebSockets KDS)`);
    console.log(`===================================================`);
  });
}).catch(err => {
  console.error('Failed to start server due to database initialization failure:', err);
  process.exit(1);
});
