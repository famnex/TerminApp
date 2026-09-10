const sequelize = require('../config/database');
const User = require('./User');
const Availability = require('./Availability');
const Topic = require('./Topic');
const Booking = require('./Booking');
const GlobalSettings = require('./GlobalSettings');
const TimeOff = require('./TimeOff');
const BatchConfig = require('./BatchConfig');
const Department = require('./Department');

// Relationships

// BatchConfig <-> Topic/Availability
BatchConfig.hasMany(Topic, { foreignKey: 'batchConfigId', onDelete: 'CASCADE' });
Topic.belongsTo(BatchConfig, { foreignKey: 'batchConfigId' });

BatchConfig.hasMany(Availability, { foreignKey: 'batchConfigId', onDelete: 'CASCADE' });
Availability.belongsTo(BatchConfig, { foreignKey: 'batchConfigId' });

// BatchConfig <-> Department (Many-to-Many)
BatchConfig.belongsToMany(Department, { through: 'BatchDepartments' });
Department.belongsToMany(BatchConfig, { through: 'BatchDepartments' });

// User <-> Availability
User.hasMany(Availability, { foreignKey: 'userId' });
Availability.belongsTo(User, { foreignKey: 'userId' });

// User <-> TimeOff
User.hasMany(TimeOff, { foreignKey: 'userId' });
TimeOff.belongsTo(User, { foreignKey: 'userId' });

// User <-> Topic
User.hasMany(Topic, { foreignKey: 'userId' });
Topic.belongsTo(User, { foreignKey: 'userId' });

// User <-> Department (Many-to-Many)
User.belongsToMany(Department, { through: 'UserDepartments' });
Department.belongsToMany(User, { through: 'UserDepartments' });

// User <-> Booking (As Provider/Expert)
User.hasMany(Booking, { foreignKey: 'providerId' }); // The expert/provider
Booking.belongsTo(User, { as: 'Provider', foreignKey: 'providerId' }); // The expert/provider

// Topic <-> Booking
Topic.hasMany(Booking, { foreignKey: 'topicId' });
Booking.belongsTo(Topic, { foreignKey: 'topicId' });

// Availability <-> Topic (Many-to-Many for topic-specific availabilities)
Availability.belongsToMany(Topic, { through: 'AvailabilityTopics', foreignKey: 'availabilityId', onDelete: 'CASCADE' });
Topic.belongsToMany(Availability, { through: 'AvailabilityTopics', foreignKey: 'topicId', onDelete: 'CASCADE' });

module.exports = {
    sequelize,
    User,
    Availability,
    Topic,
    Booking,
    GlobalSettings,
    TimeOff,
    BatchConfig,
    Department
};
