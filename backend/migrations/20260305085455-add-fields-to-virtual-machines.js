'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Добавляем поле image (обязательное, с временным дефолтом)
    await queryInterface.addColumn('virtual_machines', 'image', {
      type: Sequelize.STRING(100),
      allowNull: false,
      defaultValue: 'nginx:alpine' // для существующих записей
    });

    // Добавляем поле container_id (уникальное, может быть NULL)
    await queryInterface.addColumn('virtual_machines', 'container_id', {
      type: Sequelize.STRING(255),
      unique: true,
      allowNull: true
    });

    // Добавляем поле port (число, может быть NULL)
    await queryInterface.addColumn('virtual_machines', 'port', {
      type: Sequelize.INTEGER,
      allowNull: true,
      validate: { min: 1, max: 65535 }
    });

    // Если поле ip_address уже существует, его добавлять не нужно.
    // Если нужно добавить другие поля (например, вы также добавили поле disk?), проверьте модель.
  },

  down: async (queryInterface, Sequelize) => {
    // Откат: удаляем добавленные колонки
    await queryInterface.removeColumn('virtual_machines', 'image');
    await queryInterface.removeColumn('virtual_machines', 'container_id');
    await queryInterface.removeColumn('virtual_machines', 'port');
  }
};