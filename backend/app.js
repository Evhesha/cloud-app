require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const { sequelize, Role } = require('./models');

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());

// Подключение маршрутов
app.use('/', authRoutes);      // /register, /login, /logout
app.use('/', userRoutes);      // /profile, /users, /users/:id

// Синхронизация БД и добавление ролей по умолчанию (если нужно)
(async () => {
  try {
    await sequelize.authenticate();
    console.log('Подключение к БД установлено');
    
    // Внимание: для первого запуска используйте { force: true } чтобы пересоздать таблицы,
    // затем переключитесь на { alter: true } или просто sync().
    await sequelize.sync({ force: true }); 
    console.log('Таблицы синхронизированы');

    // Добавляем роли, если их нет
    const rolesCount = await Role.count();
    if (rolesCount === 0) {
      await Role.bulkCreate([
        { id: 1, name: 'user' },
        { id: 2, name: 'admin' }
      ]);
      console.log('Роли добавлены');
    }
  } catch (err) {
    console.error('Ошибка подключения к БД:', err);
  }
})();

module.exports = app;