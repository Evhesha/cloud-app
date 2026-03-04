const app = require('./app');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});

// require('dotenv').config();
// const express = require('express');
// const cookieParser = require('cookie-parser');
// const { Sequelize, DataTypes } = require('sequelize');
// const bcrypt = require('bcrypt');
// const jwt = require('jsonwebtoken');

// const app = express();
// app.use(express.json());
// app.use(cookieParser());

// // Подключение к PostgreSQL
// const sequelize = new Sequelize(
//   process.env.DB_DATABASE,
//   process.env.DB_USER,
//   process.env.DB_PASSWORD,
//   {
//     host: process.env.DB_HOST,
//     port: process.env.DB_PORT,
//     dialect: 'postgres',
//     logging: false,
//   }
// );

// // Модель Role
// const Role = sequelize.define('Role', {
//   id: {
//     type: DataTypes.INTEGER,
//     primaryKey: true,
//     autoIncrement: true,
//   },
//   name: {
//     type: DataTypes.STRING(50),
//     allowNull: false,
//     unique: true,
//   },
// }, {
//   tableName: 'roles',
//   timestamps: false, // не нужны createdAt/updatedAt для ролей
// });

// // Модель User с role_id
// const User = sequelize.define('User', {
//   id: {
//     type: DataTypes.INTEGER,
//     primaryKey: true,
//     autoIncrement: true,
//   },
//   name: {
//     type: DataTypes.STRING(100),
//     allowNull: false,
//   },
//   email: {
//     type: DataTypes.STRING(100),
//     allowNull: false,
//     unique: true,
//     validate: {
//       isEmail: true,
//     },
//   },
//   password: {
//     type: DataTypes.STRING,
//     allowNull: false,
//   },
//   role_id: {
//     type: DataTypes.INTEGER,
//     allowNull: false,
//     defaultValue: 1, // по умолчанию обычный пользователь
//     references: {
//       model: 'roles',
//       key: 'id',
//     },
//   },
// }, {
//   tableName: 'users',
//   timestamps: true,
//   underscored: true,
//   hooks: {
//     beforeCreate: async (user) => {
//       if (user.password) {
//         const salt = await bcrypt.genSalt(10);
//         user.password = await bcrypt.hash(user.password, salt);
//       }
//     },
//     beforeUpdate: async (user) => {
//       if (user.changed('password')) {
//         const salt = await bcrypt.genSalt(10);
//         user.password = await bcrypt.hash(user.password, salt);
//       }
//     },
//   },
// });

// // Определяем связи
// User.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });
// Role.hasMany(User, { foreignKey: 'role_id', as: 'users' });

// // Метод для проверки пароля
// User.prototype.comparePassword = async function(candidatePassword) {
//   return await bcrypt.compare(candidatePassword, this.password);
// };

// // Синхронизация БД и добавление ролей по умолчанию
// (async () => {
//   try {
//     await sequelize.authenticate();
//     console.log('Подключение к БД установлено');
    
//     // Синхронизируем модели (создаём таблицы, если их нет)
//     await sequelize.sync({ force: true });
//     console.log('Таблицы синхронизированы');

//     // Заполняем таблицу ролей, если она пуста
//     const rolesCount = await Role.count();
//     if (rolesCount === 0) {
//       await Role.bulkCreate([
//         { id: 1, name: 'user' },
//         { id: 2, name: 'admin' }
//       ]);
//       console.log('Роли добавлены');
//     }
//   } catch (err) {
//     console.error('Ошибка подключения к БД:', err);
//   }
// })();

// // Middleware для проверки JWT
// const authenticateToken = (req, res, next) => {
//   const token = req.cookies.token;

//   if (!token) {
//     return res.status(401).json({ error: 'Токен не предоставлен' });
//   }

//   jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
//     if (err) {
//       return res.status(403).json({ error: 'Недействительный токен' });
//     }
//     req.user = user; // содержит id, email, role_id
//     next();
//   });
// };

// // ---------- Публичные маршруты ----------

// // Регистрация (всегда с ролью user)
// app.post('/register', async (req, res) => {
//   const { name, email, password } = req.body;
//   if (!name || !email || !password) {
//     return res.status(400).json({ error: 'Поля name, email и password обязательны' });
//   }
//   try {
//     const user = await User.create({ 
//       name, 
//       email, 
//       password,
//       role_id: 1 // обычный пользователь
//     });
    
//     res.status(201).json({
//       id: user.id,
//       name: user.name,
//       email: user.email,
//       role_id: user.role_id,
//       createdAt: user.createdAt,
//     });
//   } catch (err) {
//     if (err.name === 'SequelizeUniqueConstraintError') {
//       return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
//     }
//     if (err.name === 'SequelizeValidationError') {
//       return res.status(400).json({ error: err.errors.map(e => e.message) });
//     }
//     console.error(err);
//     res.status(500).json({ error: 'Ошибка сервера' });
//   }
// });

// // Вход
// app.post('/login', async (req, res) => {
//   const { email, password } = req.body;
//   if (!email || !password) {
//     return res.status(400).json({ error: 'Email и пароль обязательны' });
//   }
//   try {
//     const user = await User.findOne({ where: { email } });
//     if (!user) {
//       return res.status(401).json({ error: 'Неверный email или пароль' });
//     }

//     const isMatch = await user.comparePassword(password);
//     if (!isMatch) {
//       return res.status(401).json({ error: 'Неверный email или пароль' });
//     }

//     // Генерируем JWT токен с ролью
//     const token = jwt.sign(
//       { id: user.id, email: user.email, role_id: user.role_id },
//       process.env.JWT_SECRET,
//       { expiresIn: '24h' }
//     );

//     res.cookie('token', token, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === 'production',
//       sameSite: 'strict',
//       maxAge: 24 * 60 * 60 * 1000
//     });

//     res.json({
//       user: {
//         id: user.id,
//         name: user.name,
//         email: user.email,
//         role_id: user.role_id,
//       }
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Ошибка сервера' });
//   }
// });

// // ---------- Защищённые маршруты ----------

// // Профиль текущего пользователя (с ролью)
// app.get('/profile', authenticateToken, async (req, res) => {
//   try {
//     const user = await User.findByPk(req.user.id, {
//       attributes: ['id', 'name', 'email', 'role_id', 'createdAt'],
//       include: [{
//         model: Role,
//         as: 'role',
//         attributes: ['name']
//       }]
//     });
//     if (!user) {
//       return res.status(404).json({ error: 'Пользователь не найден' });
//     }
//     res.json(user);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Ошибка сервера' });
//   }
// });

// // Получить всех пользователей (доступно всем авторизованным)
// app.get('/users', authenticateToken, async (req, res) => {
//   try {
//     const users = await User.findAll({
//       attributes: ['id', 'name', 'email', 'role_id', 'createdAt'],
//       include: [{
//         model: Role,
//         as: 'role',
//         attributes: ['name']
//       }],
//       order: [['id', 'ASC']],
//     });
//     res.json(users);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Ошибка сервера' });
//   }
// });

// // Получить одного пользователя по id
// app.get('/users/:id', authenticateToken, async (req, res) => {
//   const { id } = req.params;
//   try {
//     const user = await User.findByPk(id, {
//       attributes: ['id', 'name', 'email', 'role_id', 'createdAt'],
//       include: [{
//         model: Role,
//         as: 'role',
//         attributes: ['name']
//       }]
//     });
//     if (!user) {
//       return res.status(404).json({ error: 'Пользователь не найден' });
//     }
//     res.json(user);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Ошибка сервера' });
//   }
// });

// // Обновить пользователя
// app.put('/users/:id', authenticateToken, async (req, res) => {
//   const { id } = req.params;
//   const { name, email, password, role_id } = req.body;
//   const targetId = parseInt(id);

//   // Проверка прав: админ может обновлять любого, обычный пользователь только себя
//   if (req.user.role_id !== 2 && targetId !== req.user.id) {
//     return res.status(403).json({ error: 'Нет прав для редактирования этого пользователя' });
//   }

//   // Если обычный пользователь пытается изменить role_id, запрещаем
//   if (req.user.role_id !== 2 && role_id !== undefined && role_id !== req.user.role_id) {
//     return res.status(403).json({ error: 'Нельзя изменить роль' });
//   }

//   try {
//     const user = await User.findByPk(targetId);
//     if (!user) {
//       return res.status(404).json({ error: 'Пользователь не найден' });
//     }

//     // Обновляем только переданные поля
//     await user.update({ name, email, password, role_id });

//     res.json({
//       id: user.id,
//       name: user.name,
//       email: user.email,
//       role_id: user.role_id,
//       createdAt: user.createdAt,
//     });
//   } catch (err) {
//     if (err.name === 'SequelizeUniqueConstraintError') {
//       return res.status(409).json({ error: 'Email уже занят' });
//     }
//     if (err.name === 'SequelizeValidationError') {
//       return res.status(400).json({ error: err.errors.map(e => e.message) });
//     }
//     console.error(err);
//     res.status(500).json({ error: 'Ошибка сервера' });
//   }
// });

// // Удалить пользователя
// app.delete('/users/:id', authenticateToken, async (req, res) => {
//   const { id } = req.params;
//   const targetId = parseInt(id);

//   // Админ может удалить любого, обычный пользователь только себя
//   if (req.user.role_id !== 2 && targetId !== req.user.id) {
//     return res.status(403).json({ error: 'Нет прав для удаления этого пользователя' });
//   }

//   try {
//     const user = await User.findByPk(targetId);
//     if (!user) {
//       return res.status(404).json({ error: 'Пользователь не найден' });
//     }
//     await user.destroy();
//     res.json({ message: 'Пользователь удалён', id: targetId });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Ошибка сервера' });
//   }
// });

// // Выход
// app.post('/logout', (req, res) => {
//   res.clearCookie('token');
//   res.json({ message: 'Выход выполнен' });
// });

// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`Сервер запущен на порту ${PORT}`);
// });