const { DataTypes } = require('sequelize');
const { DEFAULT_BOOKING_DEADLINE } = require('../utils/bookingDeadline');
module.exports = async function migrateBookingDeadline(sequelize) {
    const queryInterface = sequelize.getQueryInterface();
    const columns = await queryInterface.describeTable('Users');
    if (!columns.bookingDeadline) {
        // SQLite applies the default to all existing rows as well as future inserts.
        await queryInterface.addColumn('Users', 'bookingDeadline', {
            type: DataTypes.STRING, allowNull: false, defaultValue: DEFAULT_BOOKING_DEADLINE
        });
    }
    // Do not reset choices on subsequent restarts.
    await sequelize.query('UPDATE Users SET bookingDeadline = ? WHERE bookingDeadline IS NULL', {
        replacements: [DEFAULT_BOOKING_DEADLINE]
    });
};
