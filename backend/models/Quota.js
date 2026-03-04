const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Quota = sequelize.define('Quota', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    cpu_limit: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 0 },
    },
    ram_limit: {
      type: DataTypes.BIGINT,
      allowNull: false,
      validate: { min: 0 },
    },
    disk_limit: {
      type: DataTypes.BIGINT,
      allowNull: false,
      validate: { min: 0 },
    },
    vm_limit: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 0 },
    },
  }, {
    tableName: 'quotas',
    timestamps: false,
    underscored: true,
  });

  // Ассоциации
  Quota.associate = (models) => {
    Quota.hasOne(models.Tenant, { foreignKey: 'quota_id' });
  };

  return Quota;
};