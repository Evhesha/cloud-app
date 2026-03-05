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
    image: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        isIn: [[
          'flashspys/nginx-static',
          'polygnome/lighttpd',
          'nginx:alpine',
          'httpd:alpine',
          'caddy:alpine'
        ]],
      },
    },
    container_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
    },
    port: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 65535,
      },
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
    volume_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
    },
    static_path: {
      type: DataTypes.STRING(255),
      allowNull: true, // можно хранить путь монтирования, но проще вычислять
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