'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('virtual_machines', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      tenant_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'tenants',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      network_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'networks',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      image: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      container_id: {
        type: Sequelize.STRING(255),
        unique: true,
      },
      port: {
        type: Sequelize.INTEGER,
        validate: { min: 1, max: 65535 },
      },
      ip_address: {
        type: Sequelize.STRING(39),
      },
      cpu: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      ram: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      disk: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('creating', 'running', 'stopped', 'suspended', 'deleted'),
        defaultValue: 'creating',
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('virtual_machines');
  }
};