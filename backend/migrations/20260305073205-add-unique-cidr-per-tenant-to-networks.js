'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Добавляем уникальное ограничение на (tenant_id, cidr)
    await queryInterface.addConstraint('networks', {
      fields: ['tenant_id', 'cidr'],
      type: 'unique',
      name: 'unique_cidr_per_tenant',
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Удаляем ограничение при откате
    await queryInterface.removeConstraint('networks', 'unique_cidr_per_tenant');
  }
};