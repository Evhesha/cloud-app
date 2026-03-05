'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Добавляем поле volume_name (уникальное, может быть NULL)
    await queryInterface.addColumn('virtual_machines', 'volume_name', {
      type: Sequelize.STRING(255),
      allowNull: true,
      unique: true
    });

    // Добавляем поле static_path (может быть NULL)
    await queryInterface.addColumn('virtual_machines', 'static_path', {
      type: Sequelize.STRING(255),
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    // При откате удаляем оба поля
    await queryInterface.removeColumn('virtual_machines', 'volume_name');
    await queryInterface.removeColumn('virtual_machines', 'static_path');
  }
};