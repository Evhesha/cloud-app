const { VirtualMachine, Tenant, Quota, Network, sequelize } = require('../models');
const { Op } = require('sequelize');
const Docker = require('dockerode');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const tar = require('tar-fs');
const { PassThrough } = require('stream');

// Инициализация Docker клиента
const docker = new Docker();


// Функция для определения пути к статике в контейнере по имени образа
const getStaticPathForImage = (image) => {
  const paths = {
    'nginx:alpine': '/usr/share/nginx/html',
    'httpd:alpine': '/usr/local/apache2/htdocs/',
    'caddy:alpine': '/var/www/html',
    'flashspys/nginx-static': '/usr/share/nginx/html',
    'polygnome/lighttpd': '/var/www/localhost/htdocs/',
  };
  return paths[image] || '/usr/share/nginx/html'; // по умолчанию для nginx
};

// Создание Docker volume для ВМ
const createVolumeForVM = async (vmId) => {
  const volumeName = `vm_${vmId}_static_${Date.now()}`;
  await docker.createVolume({
    Name: volumeName,
    Labels: { vm_id: vmId.toString(), created_by: 'cloud-app' }
  });
  return volumeName;
};

// Удаление volume (при удалении ВМ)
const removeVolume = async (volumeName) => {
  try {
    const volume = docker.getVolume(volumeName);
    await volume.remove();
  } catch (err) {
    console.error(`Ошибка удаления volume ${volumeName}:`, err);
  }
};

// Копирование файлов в Docker volume через временный контейнер
const copyFilesToVolume = async (volumeName, files) => {
  const imageName = 'busybox:latest'; // используем busybox вместо alpine
  await ensureImage(imageName);        // гарантируем наличие образа

  const container = await docker.createContainer({
    Image: imageName,
    HostConfig: {
      Binds: [`${volumeName}:/mnt/volume`]
    },
    Entrypoint: ['sleep', 'infinity']
  });
  await container.start();

  try {
    for (const file of files) {
      const safeName = path.basename(file.originalname || file.filename || 'upload.bin');
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vm-upload-'));
      const preparedPath = path.join(tempDir, safeName);
      await fs.copyFile(file.path, preparedPath);

      // Упаковываем файл под оригинальным именем, чтобы в контейнере он был читаемым
      const tarStream = tar.pack(tempDir, {
        entries: [safeName],
      });

      // Загружаем архив в контейнер и распаковываем в /mnt/volume
      await container.putArchive(tarStream, { path: '/mnt/volume' });

      // Удаляем временные файлы
      await fs.unlink(file.path);
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  } finally {
    await container.stop().catch(() => {});
    await container.remove().catch(() => {});
  }
};

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

const runExec = async (container, cmd) => {
  const exec = await container.exec({
    Cmd: cmd,
    AttachStdout: true,
    AttachStderr: true,
  });

  const stream = await exec.start({ hijack: true, stdin: false });
  const stdoutStream = new PassThrough();
  const stderrStream = new PassThrough();
  let stdout = '';
  let stderr = '';

  stdoutStream.on('data', (chunk) => {
    stdout += chunk.toString('utf-8');
  });
  stderrStream.on('data', (chunk) => {
    stderr += chunk.toString('utf-8');
  });

  docker.modem.demuxStream(stream, stdoutStream, stderrStream);

  await new Promise((resolve, reject) => {
    stream.on('end', resolve);
    stream.on('error', reject);
  });

  const inspect = await exec.inspect();
  return {
    stdout,
    stderr,
    exitCode: inspect.ExitCode,
  };
};

const withVolumeContainer = async (volumeName, handler) => {
  await ensureImage('busybox:latest');

  const helper = await docker.createContainer({
    Image: 'busybox:latest',
    HostConfig: {
      Binds: [`${volumeName}:/mnt/volume`]
    },
    Entrypoint: ['sleep', 'infinity']
  });

  await helper.start();

  try {
    return await handler(helper);
  } finally {
    await helper.stop().catch(() => {});
    await helper.remove().catch(() => {});
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
  const { name, image, cpu, ram, disk, network_id, port, tenant_id: requestedTenantId } = req.body;
  const { tenant_id: userTenantId, role_id } = req.user;
  const tenant_id = role_id === 2 && requestedTenantId ? Number(requestedTenantId) : userTenantId;

  // Валидация входных данных
  if (!name || !image || cpu === undefined || ram === undefined || disk === undefined) {
    return res.status(400).json({ error: 'Необходимо указать name, image, cpu, ram, disk' });
  }
  if (!tenant_id) {
    return res.status(400).json({ error: 'У вас нет тенанта. Сначала создайте тенант.' });
  }

  const cpuValue = Number(cpu);
  const ramValue = Number(ram);
  const diskValue = Number(disk);
  const portValue = port === undefined || port === null || port === '' ? null : Number(port);

  if (
    !Number.isFinite(cpuValue) ||
    !Number.isFinite(ramValue) ||
    !Number.isFinite(diskValue) ||
    cpuValue < 1 ||
    ramValue < 128 ||
    diskValue < 1
  ) {
    return res.status(400).json({ error: 'Некорректные значения cpu/ram/disk' });
  }
  if (portValue !== null && (!Number.isFinite(portValue) || portValue < 1 || portValue > 65535)) {
    return res.status(400).json({ error: 'Некорректный порт' });
  }

  let vm = null;
  let container = null;
  let volumeName = null; // для отслеживания созданного тома

  // Функция определения пути к статике в контейнере по образу
  const getStaticPathForImage = (image) => {
    const paths = {
      'nginx:alpine': '/usr/share/nginx/html',
      'httpd:alpine': '/usr/local/apache2/htdocs/',
      'caddy:alpine': '/var/www/html',
      'flashspys/nginx-static': '/usr/share/nginx/html',
      'polygnome/lighttpd': '/var/www/localhost/htdocs/',
    };
    return paths[image] || '/usr/share/nginx/html'; // значение по умолчанию
  };

  try {
    // Проверка тенанта и квоты
    const tenant = await Tenant.findByPk(tenant_id, { include: Quota });
    if (!tenant) return res.status(404).json({ error: 'Тенант не найден' });
    if (!tenant.is_active) return res.status(400).json({ error: 'Тенант деактивирован' });

    // Проверка сети (если указана)
    if (network_id) {
      const network = await Network.findOne({ where: { id: network_id, tenant_id } });
      if (!network) return res.status(404).json({ error: 'Сеть не принадлежит вашему тенанту' });
    }

    // Подсчёт текущего использования ресурсов тенанта
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

    const current = {
      vm_count: Number(usage?.vm_count) || 0,
      total_cpu: Number(usage?.total_cpu) || 0,
      total_ram: Number(usage?.total_ram) || 0,
      total_disk: Number(usage?.total_disk) || 0,
    };

    const quota = tenant.Quotum; // убедитесь, что имя ассоциации правильное (Quotum или quota)
    if (!quota) return res.status(404).json({ error: 'Квота тенанта не найдена' });

    // Проверка лимитов
    if (current.vm_count + 1 > quota.vm_limit) {
      return res.status(400).json({ error: 'Превышен лимит количества ВМ' });
    }
    if (current.total_cpu + cpuValue > quota.cpu_limit) {
      return res.status(400).json({ error: 'Превышен лимит CPU' });
    }
    if (current.total_ram + ramValue > quota.ram_limit) {
      return res.status(400).json({ error: 'Превышен лимит RAM' });
    }
    if (current.total_disk + diskValue > quota.disk_limit) {
      return res.status(400).json({ error: 'Превышен лимит диска' });
    }

    // --- Создание записи ВМ (без container_id и volume) ---
    vm = await VirtualMachine.create({
      tenant_id,
      network_id: network_id || null,
      name,
      image,
      cpu: cpuValue,
      ram: ramValue,
      disk: diskValue,
      port: portValue,
      status: 'creating' // временный статус
    });

    // --- Создание Docker volume для статических файлов ---
    volumeName = `vm_${vm.id}_static_${Date.now()}`;
    await docker.createVolume({
      Name: volumeName,
      Labels: {
        'vm_id': vm.id.toString(),
        'tenant_id': tenant_id.toString(),
        'created_by': 'cloud-app'
      }
    });

    // Путь внутри контейнера для монтирования
    const staticPath = getStaticPathForImage(image);

    // --- Подготовка конфигурации контейнера ---
    await ensureImage(image); // скачиваем образ, если его нет

    const containerConfig = {
      Image: image,
      name: `vm_${vm.id}_${name.replace(/[^a-zA-Z0-9]/g, '_')}`,
      HostConfig: {
        Memory: ramValue * 1024 * 1024, // МБ -> байты
        NanoCPUs: cpuValue * 1e9,       // ядра в нано
        PortBindings: {},
        Binds: [`${volumeName}:${staticPath}`] // монтируем том
      },
      ExposedPorts: {}
    };

    if (portValue) {
      containerConfig.ExposedPorts[`${portValue}/tcp`] = {};
      containerConfig.HostConfig.PortBindings[`${portValue}/tcp`] = [{ HostPort: String(portValue) }];
    }

    // --- Создание и запуск контейнера ---
    container = await docker.createContainer(containerConfig);
    await container.start();

    // Получаем IP-адрес контейнера
    const ip = await getContainerIp(container);

    // --- Обновляем запись ВМ ---
    await vm.update({
      container_id: container.id,
      ip_address: ip,
      volume_name: volumeName,
      static_path: staticPath,
      status: 'running'
    });

    // Успешный ответ
    res.status(201).json({
      message: 'ВМ успешно создана',
      vm: {
        ...vm.toJSON(),
        // можно добавить дополнительную информацию
      }
    });
  } catch (err) {
    // Обработка ошибок: откатываем созданные ресурсы

    // Если был создан контейнер, удаляем его
    if (container) {
      try {
        await container.remove({ force: true });
      } catch (cleanupError) {
        console.error('Container cleanup error:', cleanupError);
      }
    }

    // Если был создан volume, удаляем его
    if (volumeName) {
      try {
        const volume = docker.getVolume(volumeName);
        await volume.remove();
      } catch (volumeCleanupError) {
        console.error('Volume cleanup error:', volumeCleanupError);
      }
    }

    // Если была создана запись в БД, удаляем или помечаем как ошибку
    if (vm) {
      try {
        // Можно либо удалить запись, либо пометить как failed
        await vm.destroy(); // полное удаление, чтобы не было мусора
      } catch (dbCleanupError) {
        console.error('DB cleanup error:', dbCleanupError);
      }

      // Возвращаем информацию, что создание не удалось
      return res.status(500).json({
        error: `Ошибка создания ВМ: ${err.message}`,
        details: 'Все ресурсы были откачены'
      });
    }

    // Если ошибка произошла до создания записи
    console.error('Create VM error:', err);
    res.status(500).json({ error: `Ошибка создания ВМ: ${err.message}` });
  }
};

exports.uploadFiles = async (req, res) => {
  const { id } = req.params;
  const { role_id, tenant_id } = req.user;
  const files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'Файлы не выбраны' });
  }

  try {
    const { vm, error } = await checkVMAccess(id, req.user.id, role_id, tenant_id);
    if (error) return res.status(403).json({ error });
    if (!vm) return res.status(404).json({ error: 'ВМ не найдена' });
    if (!vm.volume_name) {
      return res.status(400).json({ error: 'У этой ВМ нет тома для статических файлов' });
    }

    // Копируем файлы в volume через временный контейнер
    await copyFilesToVolume(vm.volume_name, files);

    res.json({
      message: 'Файлы успешно загружены',
      files: files.map(f => f.originalname)
    });
  } catch (err) {
    console.error('Upload files error:', err);
    // Очистка временных файлов в случае ошибки
    for (const file of files) {
      await fs.unlink(file.path).catch(() => {});
    }
    res.status(500).json({ error: `Ошибка загрузки файлов: ${err.message}` });
  }
};

// Получение списка файлов (опционально)
exports.listFiles = async (req, res) => {
  const { id } = req.params;
  const { role_id, tenant_id } = req.user;

  try {
    const { vm, error } = await checkVMAccess(id, req.user.id, role_id, tenant_id);
    if (error) return res.status(403).json({ error });
    if (!vm) return res.status(404).json({ error: 'ВМ не найдена' });

    if (!vm.volume_name) {
      return res.json([]);
    }

    const filesInfo = await withVolumeContainer(vm.volume_name, async (helper) => {
      const command = [
        'sh',
        '-lc',
        'for f in /mnt/volume/*; do [ -f "$f" ] || continue; n=$(basename "$f"); s=$(wc -c < "$f" | tr -d " "); m=$(stat -c %Y "$f" 2>/dev/null || date +%s); echo "$n|$s|$m"; done'
      ];

      const { stdout, stderr, exitCode } = await runExec(helper, command);
      if (exitCode !== 0) {
        throw new Error(stderr || 'Не удалось прочитать список файлов');
      }

      return stdout
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => {
          const [name, sizeRaw, modifiedRaw] = line.split('|');
          const size = Number(sizeRaw || 0);
          const modifiedTs = Number(modifiedRaw || 0);
          return {
            name,
            size: Number.isFinite(size) ? size : 0,
            modified: Number.isFinite(modifiedTs) && modifiedTs > 0
              ? new Date(modifiedTs * 1000).toISOString()
              : new Date().toISOString(),
            isDirectory: false
          };
        });
    });

    res.json(filesInfo);
  } catch (err) {
    console.error('List files error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// GET /virtual-machines/:id/files/:fileName/content - получить содержимое файла
exports.getFileContent = async (req, res) => {
  const { id, fileName } = req.params;
  const { role_id, tenant_id } = req.user;

  try {
    const { vm, error } = await checkVMAccess(id, req.user.id, role_id, tenant_id);
    if (error) return res.status(403).json({ error });
    if (!vm) return res.status(404).json({ error: 'ВМ не найдена' });
    if (!vm.volume_name) {
      return res.status(400).json({ error: 'У этой ВМ нет тома для статических файлов' });
    }

    const safeName = path.basename(fileName);
    const content = await withVolumeContainer(vm.volume_name, async (helper) => {
      const { stdout, stderr, exitCode } = await runExec(helper, ['cat', `/mnt/volume/${safeName}`]);
      if (exitCode !== 0) {
        throw new Error(stderr || 'Файл не найден');
      }
      return stdout;
    });

    res.json({
      name: safeName,
      content,
    });
  } catch (err) {
    console.error('Get file content error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// DELETE /virtual-machines/:id/files/:fileName - удалить файл из volume ВМ
exports.deleteFile = async (req, res) => {
  const { id, fileName } = req.params;
  const { role_id, tenant_id } = req.user;

  try {
    const { vm, error } = await checkVMAccess(id, req.user.id, role_id, tenant_id);
    if (error) return res.status(403).json({ error });
    if (!vm) return res.status(404).json({ error: 'ВМ не найдена' });
    if (!vm.volume_name) {
      return res.status(400).json({ error: 'У этой ВМ нет тома для статических файлов' });
    }

    const safeName = path.basename(fileName);
    if (!safeName || safeName === '.' || safeName === '..') {
      return res.status(400).json({ error: 'Некорректное имя файла' });
    }

    await withVolumeContainer(vm.volume_name, async (helper) => {
      const { stderr, exitCode } = await runExec(helper, ['rm', '-f', `/mnt/volume/${safeName}`]);
      if (exitCode !== 0) {
        throw new Error(stderr || 'Не удалось удалить файл');
      }
    });

    res.json({ message: 'Файл удалён', name: safeName });
  } catch (err) {
    console.error('Delete file error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// PATCH /virtual-machines/:id – обновление конфигурации ВМ
exports.updateVM = async (req, res) => {
  const { id } = req.params;
  const { name, cpu, ram } = req.body; // disk и port не меняем (требуют пересоздания)
  const { role_id, tenant_id } = req.user;

  try {
    const { vm, error } = await checkVMAccess(id, req.user.id, role_id, tenant_id);
    if (error) return res.status(403).json({ error });
    if (!vm) return res.status(404).json({ error: 'ВМ не найдена' });

    // Проверяем, что хоть что-то передано
    if (name === undefined && cpu === undefined && ram === undefined) {
      return res.status(400).json({ error: 'Не указаны поля для обновления' });
    }

    // Подготовка данных для обновления БД
    const updateData = {};
    if (name !== undefined) updateData.name = name;

    // Если меняются ресурсы, проверяем квоты и применяем docker update
    if (cpu !== undefined || ram !== undefined) {
      // Получаем тенант и квоту
      const tenant = await Tenant.findByPk(tenant_id, { include: Quota });
      if (!tenant) return res.status(404).json({ error: 'Тенант не найден' });
      if (!tenant.is_active) return res.status(400).json({ error: 'Тенант деактивирован' });

      // Текущее использование ресурсов (исключая эту ВМ)
      const usage = await VirtualMachine.findOne({
        where: { tenant_id, id: { [Op.ne]: vm.id }, status: { [Op.not]: 'deleted' } },
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('id')), 'vm_count'],
          [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('cpu')), 0), 'total_cpu'],
          [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('ram')), 0), 'total_ram']
        ],
        raw: true
      });
      const current = usage || { vm_count: 0, total_cpu: 0, total_ram: 0 };

      // Вычисляем новые значения после изменения
      const newCpu = cpu !== undefined ? cpu : vm.cpu;
      const newRam = ram !== undefined ? ram : vm.ram;

      // Проверка лимитов квоты
      if (current.total_cpu + newCpu - vm.cpu > tenant.Quotum.cpu_limit) {
        return res.status(400).json({ error: 'Превышен лимит CPU' });
      }
      if (current.total_ram + newRam - vm.ram > tenant.Quotum.ram_limit) {
        return res.status(400).json({ error: 'Превышен лимит RAM' });
      }

      // Если контейнер существует и запущен, применяем docker update
      if (vm.container_id && vm.status === 'running') {
        try {
          const container = docker.getContainer(vm.container_id);
          const updateConfig = {};
          if (cpu !== undefined) updateConfig.CpuShares = cpu * 1024; // или NanoCPUs? Лучше использовать CpuPeriod/CpuQuota, но для простоты используем CpuShares
          if (ram !== undefined) updateConfig.Memory = ram * 1024 * 1024; // байты
          await container.update(updateConfig);
          console.log(`Контейнер ${vm.container_id} обновлён: CPU=${cpu}, RAM=${ram}`);
        } catch (dockerErr) {
          console.error('Ошибка обновления контейнера:', dockerErr);
          return res.status(500).json({ error: 'Не удалось обновить ресурсы контейнера' });
        }
      }

      // Обновляем поля в БД
      if (cpu !== undefined) updateData.cpu = cpu;
      if (ram !== undefined) updateData.ram = ram;
    }

    // Сохраняем изменения
    await vm.update(updateData);
    res.json(vm);
  } catch (err) {
    console.error('Update VM error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

// DELETE /virtual-machines/:id – полное удаление ВМ и контейнера
exports.deleteVM = async (req, res) => {
  const { id } = req.params;
  const { role_id, tenant_id } = req.user;

  try {
    const { vm, error } = await checkVMAccess(id, req.user.id, role_id, tenant_id);
    if (error) return res.status(403).json({ error });
    if (!vm) return res.status(404).json({ error: 'ВМ не найдена' });

    // Удаление контейнера
    if (vm.container_id) {
      try {
        const container = docker.getContainer(vm.container_id);
        await container.stop().catch(() => {});
        await container.remove();
      } catch (dockerErr) {
        if (dockerErr.statusCode !== 404) console.error('Ошибка удаления контейнера:', dockerErr);
      }
    }

    // Удаление volume
    if (vm.volume_name) {
      await removeVolume(vm.volume_name);
    }

    // Удаление записи из БД
    await vm.destroy();

    res.json({ message: 'ВМ и все данные удалены' });
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
