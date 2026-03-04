'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('networks', {
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
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      cidr: {
        type: Sequelize.STRING(43),
        allowNull: false,
      },
      vlan_id: {
        type: Sequelize.INTEGER,
        unique: true,
      },
      gateway: {
        type: Sequelize.STRING(39),
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('networks');
  }
};