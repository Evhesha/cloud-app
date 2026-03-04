const sequelize = require('../config/database');
const UserModel = require('./User');
const TenantModel = require('./Tenant');
const QuotaModel = require('./Quota');
const NetworkModel = require('./Network');
const VirtualMachineModel = require('./VirtualMachine');

const User = UserModel(sequelize);
const Tenant = TenantModel(sequelize);
const Quota = QuotaModel(sequelize);
const Network = NetworkModel(sequelize);
const VirtualMachine = VirtualMachineModel(sequelize);

// Ассоциации
User.belongsTo(Tenant, { foreignKey: 'tenant_id' });

Tenant.belongsTo(Quota, { foreignKey: 'quota_id' });
Tenant.hasMany(User, { foreignKey: 'tenant_id' });
Tenant.hasMany(Network, { foreignKey: 'tenant_id' });
Tenant.hasMany(VirtualMachine, { foreignKey: 'tenant_id' });

Quota.hasOne(Tenant, { foreignKey: 'quota_id' });

Network.belongsTo(Tenant, { foreignKey: 'tenant_id' });
Network.hasMany(VirtualMachine, { foreignKey: 'network_id' });

VirtualMachine.belongsTo(Tenant, { foreignKey: 'tenant_id' });
VirtualMachine.belongsTo(Network, { foreignKey: 'network_id' });

module.exports = {
  sequelize,
  User,
  Tenant,
  Quota,
  Network,
  VirtualMachine,
};