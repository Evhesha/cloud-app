'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('quotas', [
      { id: 1, name: 'basic', cpu_limit: 2, ram_limit: 4096, disk_limit: 50, vm_limit: 2 },
      { id: 2, name: 'intermediate', cpu_limit: 4, ram_limit: 8192, disk_limit: 100, vm_limit: 5 },
      { id: 3, name: 'professional', cpu_limit: 8, ram_limit: 16384, disk_limit: 200, vm_limit: 10 }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('quotas', null, {});
  }
};