const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Tenant = sequelize.define('Tenant', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    quota_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  }, {
    tableName: 'tenants',
    timestamps: false,
    underscored: true,
  });

  // Ассоциации
  Tenant.associate = (models) => {
    Tenant.belongsTo(models.Quota, { foreignKey: 'quota_id' });
    Tenant.hasMany(models.User, { foreignKey: 'tenant_id' });
    Tenant.hasMany(models.Network, { foreignKey: 'tenant_id' });
    Tenant.hasMany(models.VirtualMachine, { foreignKey: 'tenant_id' });
  };

  return Tenant;
};