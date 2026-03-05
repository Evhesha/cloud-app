const { Tenant, Quota, User, VirtualMachine, sequelize } = require('../models');
const { Op } = require('sequelize');

// Вспомогательная функция для получения статистики использования ресурсов тенанта
const getTenantStats = async (tenantId) => {
  const stats = await VirtualMachine.findOne({
    where: { tenant_id: tenantId, status: { [Op.not]: 'deleted' } },
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'total_vms'],
      [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('cpu')), 0), 'total_cpu'],
      [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('ram')), 0), 'total_ram'],
      [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('disk')), 0), 'total_disk']
    ],
    raw: true
  });
  return {
    total_vms: Number(stats.total_vms) || 0,
    total_cpu: Number(stats.total_cpu) || 0,
    total_ram: Number(stats.total_ram) || 0,
    total_disk: Number(stats.total_disk) || 0
  };
};

// GET /tenants – список всех тенантов (только для админов)
exports.getAllTenants = async (req, res) => {
  try {
    const tenants = await Tenant.findAll({
      include: [{ model: Quota }],
      order: [['id', 'ASC']]
    });

    // Добавляем статистику для каждого тенанта
    const tenantsWithStats = await Promise.all(
      tenants.map(async (tenant) => {
        const stats = await getTenantStats(tenant.id);
        return {
          ...tenant.toJSON(),
          ...stats
        };
      })
    );

    res.json(tenantsWithStats);
  } catch (err) {
    console.error('Get all tenants error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// GET /tenants/me – информация о своем тенанте
exports.getMyTenant = async (req, res) => {
  try {
    const { tenant_id } = req.user;
    if (!tenant_id) {
      return res.status(404).json({ error: 'У вас нет тенанта' });
    }

    const tenant = await Tenant.findByPk(tenant_id, {
      include: [{ model: Quota }]
    });
    if (!tenant) {
      return res.status(404).json({ error: 'Тенант не найден' });
    }

    const stats = await getTenantStats(tenant_id);
    const response = {
      ...tenant.toJSON(),
      ...stats
    };
    res.json(response);
  } catch (err) {
    console.error('Get my tenant error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// POST /tenants – создание нового тенанта
exports.createTenant = async (req, res) => {
  const { quota_id } = req.body;
  const userId = req.user.id;

  if (!quota_id) {
    return res.status(400).json({ error: 'Не указана квота (quota_id)' });
  }

  try {
    // Проверяем, есть ли уже тенант у пользователя
    if (req.user.tenant_id) {
      return res.status(400).json({ error: 'У вас уже есть тенант' });
    }

    // Проверяем существование квоты
    const quota = await Quota.findByPk(quota_id);
    if (!quota) {
      return res.status(404).json({ error: 'Квота не найдена' });
    }

    // Создаём тенант в транзакции
    const result = await sequelize.transaction(async (t) => {
      const newTenant = await Tenant.create(
        { quota_id, is_active: true },
        { transaction: t }
      );

      // Привязываем текущего пользователя к новому тенанту
      await User.update(
        { tenant_id: newTenant.id },
        { where: { id: userId }, transaction: t }
      );

      return newTenant;
    });

    // Возвращаем созданный тенант с квотой и статистикой (пока 0)
    const tenantWithQuota = await Tenant.findByPk(result.id, {
      include: [{ model: Quota }]
    });
    const stats = await getTenantStats(result.id);
    const response = {
      ...tenantWithQuota.toJSON(),
      ...stats
    };
    res.status(201).json(response);
  } catch (err) {
    console.error('Create tenant error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// PATCH /tenants/:id – обновление тенанта
exports.updateTenant = async (req, res) => {
  const { id } = req.params;
  const { quota_id, is_active } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role_id;

  try {
    const tenant = await Tenant.findByPk(id);
    if (!tenant) {
      return res.status(404).json({ error: 'Тенант не найден' });
    }

    // Проверка прав: владелец (tenant_id совпадает) или администратор
    if (userRole !== 2 && req.user.tenant_id !== tenant.id) {
      return res.status(403).json({ error: 'Нет прав для редактирования этого тенанта' });
    }

    // Если обновляется quota_id, проверить существование квоты
    if (quota_id !== undefined) {
      const quota = await Quota.findByPk(quota_id);
      if (!quota) {
        return res.status(404).json({ error: 'Квота не найдена' });
      }
    }

    // Подготовка полей для обновления
    const updateData = {};
    if (quota_id !== undefined) updateData.quota_id = quota_id;
    if (is_active !== undefined) updateData.is_active = is_active;

    await tenant.update(updateData);

    // Возвращаем обновлённый тенант с квотой и статистикой
    const updatedTenant = await Tenant.findByPk(id, {
      include: [{ model: Quota }]
    });
    const stats = await getTenantStats(id);
    const response = {
      ...updatedTenant.toJSON(),
      ...stats
    };
    res.json(response);
  } catch (err) {
    console.error('Update tenant error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// DELETE /tenants/:id – удаление тенанта
exports.deleteTenant = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role_id;

  try {
    const tenant = await Tenant.findByPk(id);
    if (!tenant) {
      return res.status(404).json({ error: 'Тенант не найден' });
    }

    // Проверка прав
    if (userRole !== 2 && req.user.tenant_id !== tenant.id) {
      return res.status(403).json({ error: 'Нет прав для удаления этого тенанта' });
    }

    // Проверяем, есть ли у тенанта активные виртуальные машины
    const vmsCount = await VirtualMachine.count({
      where: { tenant_id: id, status: { [Op.not]: 'deleted' } }
    });
    if (vmsCount > 0) {
      return res.status(409).json({ error: 'Невозможно удалить тенант, пока у него есть виртуальные машины' });
    }

    // Транзакция: отвязываем пользователей, затем удаляем тенант
    await sequelize.transaction(async (t) => {
      // Устанавливаем tenant_id = null у всех пользователей этого тенанта
      await User.update(
        { tenant_id: null },
        { where: { tenant_id: id }, transaction: t }
      );
      // Удаляем тенант
      await tenant.destroy({ transaction: t });
    });

    res.json({ message: 'Тенант успешно удалён' });
  } catch (err) {
    console.error('Delete tenant error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// GET /tenants/:id/users – список пользователей тенанта
exports.getTenantUsers = async (req, res) => {
  const { id } = req.params;
  try {
    const tenant = await Tenant.findByPk(id);
    if (!tenant) {
      return res.status(404).json({ error: 'Тенант не найден' });
    }
    const users = await User.findAll({
      where: { tenant_id: id },
      attributes: ['id', 'name', 'email', 'role_id']
    });
    res.json(users);
  } catch (err) {
    console.error('Get tenant users error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// POST /tenants/:id/users – добавить пользователя в тенант (админ)
exports.addUserToTenant = async (req, res) => {
  const { id } = req.params;
  const { user_id, email } = req.body; // можно передать id или email

  if (!user_id && !email) {
    return res.status(400).json({ error: 'Необходимо указать user_id или email' });
  }

  try {
    const tenant = await Tenant.findByPk(id);
    if (!tenant) {
      return res.status(404).json({ error: 'Тенант не найден' });
    }

    // Находим пользователя
    let user;
    if (user_id) {
      user = await User.findByPk(user_id);
    } else {
      user = await User.findOne({ where: { email } });
    }

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Привязываем пользователя к тенанту (даже если у него уже был другой тенант)
    await user.update({ tenant_id: tenant.id });

    res.json({ message: 'Пользователь добавлен в тенант', user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error('Add user to tenant error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// DELETE /tenants/:id/users/:userId – удалить пользователя из тенанта
exports.removeUserFromTenant = async (req, res) => {
  const { id, userId } = req.params;

  try {
    const tenant = await Tenant.findByPk(id);
    if (!tenant) {
      return res.status(404).json({ error: 'Тенант не найден' });
    }

    const user = await User.findOne({ where: { id: userId, tenant_id: id } });
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не привязан к этому тенанту' });
    }

    // Отвязываем пользователя
    await user.update({ tenant_id: null });

    res.json({ message: 'Пользователь удалён из тенанта' });
  } catch (err) {
    console.error('Remove user from tenant error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};