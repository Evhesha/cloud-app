const sequelize = require('../config/database');
const RoleModel = require('./Role');
const UserModel = require('./User');

const Role = RoleModel(sequelize);
const User = UserModel(sequelize);

// Определяем связи
User.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });
Role.hasMany(User, { foreignKey: 'role_id', as: 'users' });

module.exports = {
  sequelize,
  Role,
  User,
};