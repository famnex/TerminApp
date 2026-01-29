const express = require('express');
const router = express.Router();
const { User, Topic, Booking, Availability, Department } = require('../models');
const { getAvailableSlots } = require('../utils/scheduler');
const { addMinutes, parseISO } = require('date-fns');
const mailService = require('../services/mail');

// GET /api/public/departments
router.get('/departments', async (req, res) => {
    try {
        const departments = await Department.findAll({
            attributes: ['id', 'name'],
            order: [['name', 'ASC']]
        });
        res.json(departments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/public/users - Directory
router.get('/users', async (req, res) => {
    try {
        const { Op } = require('sequelize');
        const users = await User.findAll({
            attributes: ['id', 'displayName', 'email', 'position', 'profileImage', 'showEmail'],
            include: [
                {
                    model: Availability,
                    required: false, // LEFT JOIN: Include users even if they have no availability
                    where: {
                        [Op.or]: [
                            { validUntil: null },
                            { validUntil: { [Op.gte]: new Date() } }
                        ]
                    },
                    attributes: ['id'] // Just to check existence later in frontend if needed, or we rely on logic below
                },
                {
                    model: Department,
                    attributes: ['id', 'name'],
                    through: { attributes: [] }
                }
            ],
            // group: ['User.id'] // Grouping might be needed if multiple availabilities cause dupes, but Sequelize handles simple Includes well usually. 
            // If we get duplicates due to multiple availabilities/departments, we might need `distinct: true`
        });

        // Transform to add a simple "hasAvailability" flag for easier frontend usage
        const enhancedUsers = users.map(user => {
            const u = user.toJSON();
            u.hasAvailability = u.Availabilities && u.Availabilities.length > 0;
            delete u.Availabilities; // Clean up
            return u;
        });

        res.json(enhancedUsers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/public/settings - Public Config
router.get('/settings', async (req, res) => {
    try {
        const { GlobalSettings } = require('../models');
        const settings = await GlobalSettings.findAll({
            where: {
                key: ['school_logo', 'app_title', 'primary_color']
            }
        });

        const config = settings.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});
        res.json(config);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/public/users/:id/topics
router.get('/users/:id/topics', async (req, res) => {
    try {
        const topics = await Topic.findAll({
            where: { userId: req.params.id }
        });
        res.json(topics);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/public/slots
router.get('/slots', async (req, res) => {
    try {
        const { userId, topicId, start, end } = req.query;
        if (!userId || !topicId || !start || !end) {
            return res.status(400).json({ error: 'Missing parameters' });
        }

        const slots = await getAvailableSlots(
            parseInt(userId),
            start,
            end,
            parseInt(topicId)
        );
        res.json(slots);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/public/book
router.post('/book', async (req, res) => {
    try {
        const { topicId, slotTimestamp, customerName, customerEmail, customerPhone } = req.body;

        const topic = await Topic.findByPk(topicId);
        if (!topic) return res.status(404).json({ error: 'Topic not found' });

        const startTime = parseISO(slotTimestamp);
        const endTime = addMinutes(startTime, topic.durationMinutes);

        // Create Booking
        const booking = await Booking.create({
            slotStartTime: startTime,
            slotEndTime: endTime,
            customerName,
            customerEmail,
            customerPhone,
            topicId: topicId,
            providerId: topic.userId, // The expert who owns this topic
            status: 'confirmed'
        });

        // Send Email
        await mailService.sendConfirmation(booking).catch(console.error);

        res.json({ success: true, booking });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/public/recover
router.post('/recover', async (req, res) => {
    try {
        const { email } = req.body;
        const bookings = await Booking.findAll({
            where: {
                customerEmail: email,
                status: 'confirmed',
                slotStartTime: { [require('sequelize').Op.gt]: new Date() } // Future bookings only
            }
        });

        if (bookings.length > 0) {
            await mailService.sendRecoveryLink(email, bookings).catch(console.error);
        }

        res.json({ success: true, message: 'Falls Buchungen existieren, wurde eine E-Mail versendet.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/public/cancel
router.post('/cancel', async (req, res) => {
    try {
        const { token, reason } = req.body;
        const booking = await Booking.findOne({ where: { cancellationToken: token } });

        if (!booking) return res.status(404).json({ error: 'Buchung nicht gefunden.' });
        if (booking.status === 'cancelled') return res.status(400).json({ error: 'Bereits storniert.' });

        booking.status = 'cancelled';
        booking.cancellationReason = reason;
        await booking.save();

        await mailService.sendCancellation(booking).catch(console.error);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/public/setup-status
router.get('/setup-status', async (req, res) => {
    try {
        const adminCount = await User.count({ where: { isAdmin: true } });
        res.json({ isSetup: adminCount > 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/public/setup
router.post('/setup', async (req, res) => {
    try {
        const adminCount = await User.count({ where: { isAdmin: true } });
        if (adminCount > 0) {
            return res.status(403).json({ error: 'System already set up' });
        }

        const { username, password, displayName, email } = req.body;

        const admin = await User.create({
            username,
            password,
            displayName,
            email,
            isAdmin: true,
            authMethod: 'local'
        });

        res.status(201).json({ success: true, user: { id: admin.id, username: admin.username } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
