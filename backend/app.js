require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const tenantRoutes = require('./routes/tenantRoutes');
const networkRoutes = require('./routes/networkRoutes');
const virtualMachinesRoutes = require('./routes/virtualMachinesRoutes');
const db = require('./models');
const bcrypt = require('bcrypt');

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());

// Настройка CORS
const corsOptions = {
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Подключение маршрутов
app.use('/', authRoutes);
app.use('/', userRoutes);
app.use('/tenants', tenantRoutes);
app.use('/networks', networkRoutes);
app.use('/vms', virtualMachinesRoutes);

// Синхронизация БД
(async () => {
  try {
    await db.sequelize.authenticate();
    console.log('✅ Подключение к БД установлено');

  } catch (err) {
    console.error('❌ Ошибка подключения к БД:', err);
  }
})();

module.exports = app;