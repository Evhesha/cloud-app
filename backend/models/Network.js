const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Network = sequelize.define('Network', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    cidr: {
      type: DataTypes.STRING(43),
      allowNull: false,
      validate: {
        is: /^([0-9]{1,3}\.){3}[0-9]{1,3}\/[0-9]{1,2}$/,
      },
    },
    vlan_id: {
      type: DataTypes.INTEGER,
      unique: true,
      validate: { min: 1, max: 4094 },
    },
    gateway: {
      type: DataTypes.STRING(39),
      validate: {
        isIP: true,
      },
    },
    tenant_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  }, {
    tableName: 'networks',
    timestamps: false,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['tenant_id', 'cidr'],
        name: 'unique_cidr_per_tenant',
      },
    ],
  });

  // Ассоциации
  Network.associate = (models) => {
    Network.belongsTo(models.Tenant, { foreignKey: 'tenant_id' });
    Network.hasMany(models.VirtualMachine, { foreignKey: 'network_id' });
  };

  return Network;
};