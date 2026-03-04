'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('quotas', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
      },
      cpu_limit: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      ram_limit: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      disk_limit: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      vm_limit: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('quotas');
  }
};