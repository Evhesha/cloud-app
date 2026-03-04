const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const VirtualMachine = sequelize.define('VirtualMachine', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    ip_address: {
      type: DataTypes.STRING(39),
      validate: {
        isIP: true,
      },
    },
    cpu: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1 },
    },
    ram: {
      type: DataTypes.BIGINT,
      allowNull: false,
      validate: { min: 128 },
    },
    disk: {
      type: DataTypes.BIGINT,
      allowNull: false,
      validate: { min: 1 },
    },
    status: {
      type: DataTypes.ENUM('creating', 'running', 'stopped', 'suspended', 'deleted'),
      defaultValue: 'creating',
    },
    tenant_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    network_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  }, {
    tableName: 'virtual_machines',
    timestamps: false,
    underscored: true,
  });

  // Ассоциации
  VirtualMachine.associate = (models) => {
    VirtualMachine.belongsTo(models.Tenant, { foreignKey: 'tenant_id' });
    VirtualMachine.belongsTo(models.Network, { foreignKey: 'network_id' });
  };

  return VirtualMachine;
};