require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
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

// Синхронизация БД
(async () => {
  try {
    await db.sequelize.authenticate();
    console.log('✅ Подключение к БД установлено');
    
    // ВНИМАНИЕ: { force: true } удалит все таблицы и данные.
    // Для первого запуска используйте force: true, затем переключите на { alter: true } или просто sync()
    await db.sequelize.sync({ alter: true }); 
    console.log('✅ Таблицы синхронизированы');

  } catch (err) {
    console.error('❌ Ошибка подключения к БД:', err);
  }
})();

module.exports = app;