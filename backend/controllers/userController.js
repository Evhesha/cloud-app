const { User } = require('../models');

// Получить профиль текущего пользователя
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'name', 'email', 'role_id']
    });
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// Получить всех пользователей
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'role_id'],
      order: [['id', 'ASC']],
    });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// Получить пользователя по ID
exports.getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findByPk(id, {
      attributes: ['id', 'name', 'email', 'role_id']
    });
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// Обновить пользователя
exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email, password, role_id } = req.body;
  const targetId = parseInt(id);

  // Проверка прав: админ может обновлять любого, обычный пользователь только себя
  if (req.user.role_id !== 2 && targetId !== req.user.id) {
    return res.status(403).json({ error: 'Нет прав для редактирования этого пользователя' });
  }

  // Если обычный пользователь пытается изменить role_id, запрещаем
  if (req.user.role_id !== 2 && role_id !== undefined && role_id !== req.user.role_id) {
    return res.status(403).json({ error: 'Нельзя изменить роль' });
  }

  try {
    const user = await User.findByPk(targetId);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    await user.update({ name, email, password, role_id });

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role_id: user.role_id,
      createdAt: user.createdAt,
    });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Email уже занят' });
    }
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({ error: err.errors.map(e => e.message) });
    }
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// Удалить пользователя
exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  const targetId = parseInt(id);

  if (req.user.role_id !== 2 && targetId !== req.user.id) {
    return res.status(403).json({ error: 'Нет прав для удаления этого пользователя' });
  }

  try {
    const user = await User.findByPk(targetId);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    await user.destroy();
    res.json({ message: 'Пользователь удалён', id: targetId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};