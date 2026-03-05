const { VirtualMachine, Tenant, Quota, Network, sequelize } = require('../models');
const { Op } = require('sequelize');
const Docker = require('dockerode');

// Инициализация Docker клиента
const docker = new Docker();

// Вспомогательная функция для проверки прав доступа к ВМ
const checkVMAccess = async (vmId, userId, userRole, userTenantId) => {
  const vm = await VirtualMachine.findByPk(vmId);
  if (!vm) return { vm: null, error: 'ВМ не найдена' };
  if (userRole === 2) return { vm, error: null };
  if (vm.tenant_id !== userTenantId) {
    return { vm, error: 'Нет доступа к этой ВМ' };
  }
  return { vm, error: null };
};

// Вспомогательная функция для получения IP контейнера
const getContainerIp = async (container) => {
  const data = await container.inspect();
  // В зависимости от сети может быть разный путь. Обычно IP берётся из NetworkSettings.IPAddress
  return data.NetworkSettings.IPAddress || '0.0.0.0';
};

// Вспомогательная функция для скачивания образа (если отсутствует)
const ensureImage = async (imageName) => {
  const images = await docker.listImages();
  const exists = images.some(img => img.RepoTags && img.RepoTags.includes(imageName));
  if (!exists) {
    console.log(`Pulling image ${imageName}...`);
    return new Promise((resolve, reject) => {
      docker.pull(imageName, (err, stream) => {
        if (err) return reject(err);
        docker.modem.followProgress(stream, (err, output) => {
          if (err) return reject(err);
          resolve();
        });
      });
    });
  }
};

// GET /virtual-machines – список ВМ
exports.getAllVMs = async (req, res) => {
  try {
    const { role_id, tenant_id } = req.user;
    let where = {};
    if (role_id !== 2) {
      if (!tenant_id) return res.json([]);
      where.tenant_id = tenant_id;
    }
    const vms = await VirtualMachine.findAll({
      where,
      include: [
        { model: Tenant, attributes: ['id', 'is_active'] },
        { model: Network, attributes: ['id', 'name', 'cidr'] }
      ],
      order: [['id', 'ASC']]
    });
    res.json(vms);
  } catch (err) {
    console.error('Get all VMs error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// GET /virtual-machines/:id – детальная информация о ВМ
exports.getVMById = async (req, res) => {
  try {
    const { id } = req.params;
    const { role_id, tenant_id } = req.user;
    const { vm, error } = await checkVMAccess(id, req.user.id, role_id, tenant_id);
    if (error) return res.status(403).json({ error });
    if (!vm) return res.status(404).json({ error: 'ВМ не найдена' });
    res.json(vm);
  } catch (err) {
    console.error('Get VM by id error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// POST /virtual-machines – создание ВМ
exports.createVM = async (req, res) => {
  const { name, image, cpu, ram, disk, network_id, port } = req.body;
  const { role_id, tenant_id } = req.user;

  // Валидация обязательных полей
  if (!name || !image || !cpu || !ram || !disk) {
    return res.status(400).json({ error: 'Необходимо указать name, image, cpu, ram, disk' });
  }
  if (!tenant_id) {
    return res.status(400).json({ error: 'У вас нет тенанта. Сначала создайте тенант.' });
  }

  try {
    // Проверка тенанта и квот
    const tenant = await Tenant.findByPk(tenant_id, { include: Quota });
    if (!tenant) return res.status(404).json({ error: 'Тенант не найден' });
    if (!tenant.is_active) return res.status(400).json({ error: 'Тенант деактивирован' });

    // Проверка сети (если указана)
    if (network_id) {
      const network = await Network.findOne({ where: { id: network_id, tenant_id } });
      if (!network) return res.status(404).json({ error: 'Сеть не принадлежит вашему тенанту' });
    }

    // Подсчёт текущего использования ресурсов
    const usage = await VirtualMachine.findOne({
      where: { tenant_id, status: { [Op.not]: 'deleted' } },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'vm_count'],
        [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('cpu')), 0), 'total_cpu'],
        [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('ram')), 0), 'total_ram'],
        [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('disk')), 0), 'total_disk']
      ],
      raw: true
    });
    const current = usage || { vm_count: 0, total_cpu: 0, total_ram: 0, total_disk: 0 };

    // Проверка лимитов квоты
    if (+current.vm_count + 1 > tenant.Quotum.vm_limit) {
      return res.status(400).json({ error: 'Превышен лимит количества ВМ' });
    }
    if (+current.total_cpu + cpu > tenant.Quotum.cpu_limit) {
      return res.status(400).json({ error: 'Превышен лимит CPU' });
    }
    if (+current.total_ram + ram > tenant.Quotum.ram_limit) {
      return res.status(400).json({ error: 'Превышен лимит RAM' });
    }
    if (+current.total_disk + disk > tenant.Quotum.disk_limit) {
      return res.status(400).json({ error: 'Превышен лимит диска' });
    }

    // Создаём запись ВМ со статусом 'creating'
    const vm = await VirtualMachine.create({
      tenant_id,
      network_id: network_id || null,
      name,
      image,
      cpu,
      ram,
      disk,
      port,
      status: 'creating'
    });

    // Асинхронно запускаем Docker контейнер, чтобы не блокировать ответ
    (async () => {
      try {
        // Убедимся, что образ есть локально
        await ensureImage(image);

        // Параметры контейнера
        const containerConfig = {
          Image: image,
          name: `vm_${vm.id}_${name.replace(/[^a-zA-Z0-9]/g, '_')}`,
          HostConfig: {
            Memory: ram * 1024 * 1024, // МБ -> байты
            NanoCPUs: cpu * 1e9,        // cpu ядра в нано
            PortBindings: {}
          },
          ExposedPorts: {}
        };

        // Проброс порта, если указан
        if (port) {
          containerConfig.ExposedPorts[`${port}/tcp`] = {};
          containerConfig.HostConfig.PortBindings[`${port}/tcp`] = [{ HostPort: port.toString() }];
        }

        // Создаём контейнер
        const container = await docker.createContainer(containerConfig);
        await container.start();

        // Получаем IP-адрес контейнера
        const ip = await getContainerIp(container);

        // Обновляем запись в БД
        await vm.update({
          container_id: container.id,
          ip_address: ip,
          status: 'running'
        });
        console.log(`Контейнер для ВМ ${vm.id} успешно запущен`);
      } catch (err) {
        console.error(`Ошибка запуска контейнера для ВМ ${vm.id}:`, err);
        // Обновляем статус на 'stopped' (или можно добавить поле error)
        await vm.update({ status: 'stopped' });
      }
    })();

    // Возвращаем клиенту информацию о создаваемой ВМ
    res.status(202).json({
      message: 'ВМ создаётся, контейнер запускается',
      vm: {
        ...vm.toJSON(),
        container_id: null,
        ip_address: null,
        status: 'creating'
      }
    });
  } catch (err) {
    console.error('Create VM error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// PATCH /virtual-machines/:id – обновление метаданных (только имя)
exports.updateVM = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const { role_id, tenant_id } = req.user;

  try {
    const { vm, error } = await checkVMAccess(id, req.user.id, role_id, tenant_id);
    if (error) return res.status(403).json({ error });
    if (!vm) return res.status(404).json({ error: 'ВМ не найдена' });

    if (name !== undefined) {
      vm.name = name;
      await vm.save();
    }
    res.json(vm);
  } catch (err) {
    console.error('Update VM error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// DELETE /virtual-machines/:id – удаление ВМ
exports.deleteVM = async (req, res) => {
  const { id } = req.params;
  const { role_id, tenant_id } = req.user;

  try {
    const { vm, error } = await checkVMAccess(id, req.user.id, role_id, tenant_id);
    if (error) return res.status(403).json({ error });
    if (!vm) return res.status(404).json({ error: 'ВМ не найдена' });

    // Если контейнер существует и не в статусе 'deleted', останавливаем и удаляем его
    if (vm.container_id && vm.status !== 'deleted') {
      try {
        const container = docker.getContainer(vm.container_id);
        await container.stop();
        await container.remove();
      } catch (dockerErr) {
        console.error(`Ошибка удаления контейнера ${vm.container_id}:`, dockerErr);
        // Продолжаем, даже если контейнер не найден (возможно, уже удалён вручную)
      }
    }

    // Мягкое удаление записи (можно и физическое)
    await vm.update({ status: 'deleted' });
    res.json({ message: 'ВМ удалена' });
  } catch (err) {
    console.error('Delete VM error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// POST /virtual-machines/:id/start – запуск ВМ
exports.startVM = async (req, res) => {
  const { id } = req.params;
  const { role_id, tenant_id } = req.user;

  try {
    const { vm, error } = await checkVMAccess(id, req.user.id, role_id, tenant_id);
    if (error) return res.status(403).json({ error });
    if (!vm) return res.status(404).json({ error: 'ВМ не найдена' });

    if (vm.status === 'running') {
      return res.status(400).json({ error: 'ВМ уже запущена' });
    }

    if (!vm.container_id) {
      return res.status(400).json({ error: 'Нет container_id, невозможно запустить' });
    }

    const container = docker.getContainer(vm.container_id);
    await container.start();

    // Обновляем статус
    await vm.update({ status: 'running' });
    res.json({ message: 'ВМ запущена', vm });
  } catch (err) {
    console.error('Start VM error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// POST /virtual-machines/:id/stop – остановка ВМ
exports.stopVM = async (req, res) => {
  const { id } = req.params;
  const { role_id, tenant_id } = req.user;

  try {
    const { vm, error } = await checkVMAccess(id, req.user.id, role_id, tenant_id);
    if (error) return res.status(403).json({ error });
    if (!vm) return res.status(404).json({ error: 'ВМ не найдена' });

    if (vm.status !== 'running') {
      return res.status(400).json({ error: 'ВМ не запущена' });
    }

    if (!vm.container_id) {
      return res.status(400).json({ error: 'Нет container_id, невозможно остановить' });
    }

    const container = docker.getContainer(vm.container_id);
    await container.stop();

    await vm.update({ status: 'stopped' });
    res.json({ message: 'ВМ остановлена', vm });
  } catch (err) {
    console.error('Stop VM error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};