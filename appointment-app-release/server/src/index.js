const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { sequelize } = require('./models');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve Uploads
const path = require('path');
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadDir));

const { authenticateToken } = require('./middleware/auth');

const publicRoutes = require('./routes/public');
app.use('/api/public', publicRoutes);

const versionRoutes = require('./routes/version');
app.use('/api/public/version', versionRoutes);

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const adminRoutes = require('./routes/admin');
// Protect all /api/admin routes with authenticateToken
app.use('/api/admin', authenticateToken, adminRoutes);

const availabilityRoutes = require('./routes/availability');
app.use('/api/availability', authenticateToken, availabilityRoutes);

const bookingRoutes = require('./routes/bookings');
app.use('/api/bookings', authenticateToken, bookingRoutes);

const topicRoutes = require('./routes/topics');
app.use('/api/topics', authenticateToken, topicRoutes);

const timeOffRoutes = require('./routes/timeoff');
app.use('/api/timeoff', authenticateToken, timeOffRoutes);

// Serve Frontend in Production
// Serve Frontend
const publicDir = path.join(__dirname, '../public');
const fs = require('fs');

if (fs.existsSync(publicDir)) {
    console.log('Serving frontend from:', publicDir);
    app.use(express.static(publicDir));
    app.get('*', (req, res) => {
        res.sendFile(path.join(publicDir, 'index.html'));
    });
} else {
    app.get('/', (req, res) => {
        res.send('Appointment App API Running (Dev Mode). Frontend not found at: ' + publicDir);
    });
}

// Sync Database and Start Server
sequelize.sync().then(() => {
    console.log('Database synced');

    // Start Jobs
    const startReminderJob = require('./jobs/reminders');
    startReminderJob();
    const startArchiveJob = require('./jobs/archive');
    startArchiveJob();

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}).catch(err => {
    console.error('Database sync error:', err);
});
