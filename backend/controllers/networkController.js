const { Network, VirtualMachine, Tenant, sequelize } = require('../models');
const { Op } = require('sequelize');

// GET /networks – список сетей
exports.getAllNetworks = async (req, res) => {
  try {
    const { role_id, tenant_id } = req.user;
    let where = {};

    // Админ видит все сети, обычный пользователь – только своего тенанта
    if (role_id !== 2) {
      if (!tenant_id) {
        return res.json([]); // у пользователя нет тенанта – пустой список
      }
      where.tenant_id = tenant_id;
    }

    const networks = await Network.findAll({
      where,
      include: [
        {
          model: Tenant,
          attributes: ['id', 'is_active']
        }
      ],
      order: [['id', 'ASC']]
    });

    // Добавляем информацию о количестве виртуальных машин в каждой сети
    const networksWithStats = await Promise.all(
      networks.map(async (network) => {
        const vmCount = await VirtualMachine.count({
          where: { network_id: network.id, status: { [Op.not]: 'deleted' } }
        });
        return {
          ...network.toJSON(),
          vm_count: vmCount
        };
      })
    );

    res.json(networksWithStats);
  } catch (err) {
    console.error('Get all networks error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// GET /networks/:id – получение сети по ID
exports.getNetworkById = async (req, res) => {
  try {
    const { id } = req.params;
    const { role_id, tenant_id } = req.user;

    const network = await Network.findByPk(id, {
      include: [{ model: Tenant, attributes: ['id', 'is_active'] }]
    });

    if (!network) {
      return res.status(404).json({ error: 'Сеть не найдена' });
    }

    // Проверка прав: админ или владелец тенанта
    if (role_id !== 2 && network.tenant_id !== tenant_id) {
      return res.status(403).json({ error: 'Нет доступа к этой сети' });
    }

    // Статистика ВМ в сети
    const vmCount = await VirtualMachine.count({
      where: { network_id: id, status: { [Op.not]: 'deleted' } }
    });

    const response = {
      ...network.toJSON(),
      vm_count: vmCount
    };
    res.json(response);
  } catch (err) {
    console.error('Get network by id error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// POST /networks – создание сети
exports.createNetwork = async (req, res) => {
  const { name, cidr, vlan_id, gateway } = req.body;
  const { role_id, tenant_id } = req.user;

  // Проверка обязательных полей
  if (!name || !cidr || vlan_id === undefined) {
    return res.status(400).json({ error: 'Необходимо указать name, cidr и vlan_id' });
  }

  try {
    // Определяем, для какого тенанта создаётся сеть
    let targetTenantId = tenant_id;
    // Если админ, может указать tenant_id в теле (опционально), иначе используем свой
    if (role_id === 2 && req.body.tenant_id) {
      targetTenantId = req.body.tenant_id;
    }

    if (!targetTenantId) {
      return res.status(400).json({ error: 'Не указан tenant_id (нет тенанта у пользователя)' });
    }

    // Проверяем существование тенанта (и активен ли он)
    const tenant = await Tenant.findByPk(targetTenantId);
    if (!tenant) {
      return res.status(404).json({ error: 'Тенант не найден' });
    }
    if (!tenant.is_active) {
      return res.status(400).json({ error: 'Тенант неактивен, создание сетей запрещено' });
    }

    // Проверяем уникальность vlan_id
    const existingVlan = await Network.findOne({ where: { vlan_id } });
    if (existingVlan) {
      return res.status(409).json({ error: 'VLAN ID уже используется' });
    }

    // Проверяем CIDR на корректность (можно дополнительно)
    // Создаём сеть
    const newNetwork = await Network.create({
      tenant_id: targetTenantId,
      name,
      cidr,
      vlan_id,
      gateway
    });

    res.status(201).json(newNetwork);
  } catch (err) {
    console.error('Create network error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// PATCH /networks/:id – обновление сети
exports.updateNetwork = async (req, res) => {
  const { id } = req.params;
  const { name, gateway } = req.body; // обычно только эти поля можно менять
  const { role_id, tenant_id } = req.user;

  try {
    const network = await Network.findByPk(id);
    if (!network) {
      return res.status(404).json({ error: 'Сеть не найдена' });
    }

    // Проверка прав
    if (role_id !== 2 && network.tenant_id !== tenant_id) {
      return res.status(403).json({ error: 'Нет прав для изменения этой сети' });
    }

    // Обновляем только разрешённые поля
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (gateway !== undefined) updateData.gateway = gateway;

    await network.update(updateData);

    res.json(network);
  } catch (err) {
    console.error('Update network error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// DELETE /networks/:id – удаление сети
exports.deleteNetwork = async (req, res) => {
  const { id } = req.params;
  const { role_id, tenant_id } = req.user;

  try {
    const network = await Network.findByPk(id);
    if (!network) {
      return res.status(404).json({ error: 'Сеть не найдена' });
    }

    // Проверка прав
    if (role_id !== 2 && network.tenant_id !== tenant_id) {
      return res.status(403).json({ error: 'Нет прав для удаления этой сети' });
    }

    // Проверяем, есть ли виртуальные машины в этой сети
    const vmsCount = await VirtualMachine.count({
      where: { network_id: id, status: { [Op.not]: 'deleted' } }
    });
    if (vmsCount > 0) {
      return res.status(409).json({ error: 'Невозможно удалить сеть, в ней есть виртуальные машины' });
    }

    await network.destroy();
    res.json({ message: 'Сеть успешно удалена' });
  } catch (err) {
    console.error('Delete network error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};