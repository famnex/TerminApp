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
            where: { bookingPageActive: true },
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

        enhancedUsers.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '', 'de', { sensitivity: 'base' }));
        res.json(enhancedUsers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/public/settings - Public Config
router.get('/settings', async (req, res) => {
    try {
        const { GlobalSettings, User } = require('../models');
        const { Op } = require('sequelize');

        const settings = await GlobalSettings.findAll({
            where: {
                key: [
                    'school_logo', 
                    'app_title', 
                    'primary_color', 
                    'sso_enabled', 
                    'sso_jwt_param', 
                    'sso_login_url',
                    'sso_logout_redirect', 
                    'sso_logout_label',
                    'ldap_enabled'
                ]
            }
        });

        const config = settings.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {});

        // Check if LDAP is enabled
        const ldapEnabled = config.ldap_enabled === '1' || config.ldap_enabled === 'true' || config.ldap_enabled === true;

        // Check if any local user accounts exist (users with authMethod === 'local' or non-empty local password)
        const localUserCount = await User.count({
            where: {
                [Op.or]: [
                    { authMethod: 'local' },
                    {
                        password: {
                            [Op.and]: [
                                { [Op.ne]: null },
                                { [Op.ne]: '' }
                            ]
                        }
                    }
                ]
            }
        });

        const hasLocalUsers = localUserCount > 0;
        const idpUrl = (config.sso_login_url || '').trim() || (config.sso_logout_redirect || '').trim() || null;
        const directIdpLogin = !ldapEnabled && !hasLocalUsers && Boolean(idpUrl);

        config.ldapEnabled = ldapEnabled;
        config.hasLocalUsers = hasLocalUsers;
        config.idpLoginUrl = idpUrl;
        config.directIdpLogin = directIdpLogin;

        res.json(config);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/public/users/:id - Single Expert Public Info
router.get('/users/:id', async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id, {
            attributes: ['id', 'displayName', 'position', 'profileImage', 'bookingPageActive']
        });
        if (!user || !user.bookingPageActive) {
            return res.status(403).json({ error: 'Diese Buchungsseite ist derzeit deaktiviert.' });
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/public/users/:id/topics
router.get('/users/:id/topics', async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user || !user.bookingPageActive) {
            return res.status(403).json({ error: 'Diese Buchungsseite ist derzeit deaktiviert.' });
        }

        const topics = await Topic.findAll({
            where: { userId: req.params.id },
            order: [['order', 'ASC'], ['id', 'ASC']]
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

        const user = await User.findByPk(userId);
        if (!user || !user.bookingPageActive) {
            return res.status(403).json({ error: 'Diese Buchungsseite ist derzeit deaktiviert.' });
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

        const user = await User.findByPk(topic.userId);
        if (!user || !user.bookingPageActive) {
            return res.status(403).json({ error: 'Diese Buchungsseite ist derzeit deaktiviert.' });
        }

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

// GET /api/public/cancel-info/:token
router.get('/cancel-info/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const { Op } = require('sequelize');

        const booking = await Booking.findOne({
            where: {
                [Op.or]: [
                    { cancellationToken: token },
                    { providerCancellationToken: token }
                ]
            },
            include: [
                { model: Topic },
                { model: User, as: 'Provider' }
            ]
        });

        if (!booking) {
            return res.status(404).json({ error: 'Buchung nicht gefunden oder ungültiger Link.' });
        }

        // Check if caller is authenticated as provider or admin
        let loggedInUserId = null;
        let isAdmin = false;
        const authHeader = req.headers['authorization'];
        const bearerToken = authHeader && authHeader.split(' ')[1];
        if (bearerToken) {
            try {
                const jwt = require('jsonwebtoken');
                const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_change_me';
                const decoded = jwt.verify(bearerToken, JWT_SECRET);
                loggedInUserId = decoded.id;
                isAdmin = decoded.isAdmin;
            } catch (e) {
                // Ignore invalid tokens
            }
        }

        // Determine role:
        // 1. If providerCancellationToken matches token -> definitely provider
        // 2. If legacy query param ?role=provider -> provider
        // 3. If logged-in user is the provider or admin -> provider
        // 4. Otherwise -> customer
        let role = 'customer';
        if (booking.providerCancellationToken && booking.providerCancellationToken === token) {
            role = 'provider';
        } else if (req.query.role === 'provider') {
            role = 'provider';
        } else if (loggedInUserId && (loggedInUserId === booking.providerId || isAdmin)) {
            role = 'provider';
        }

        const providerId = booking.providerId || booking.Topic?.userId;
        const topicId = booking.topicId || booking.Topic?.id;

        res.json({
            id: booking.id,
            role,
            status: booking.status,
            cancellationReason: booking.cancellationReason,
            slotStartTime: booking.slotStartTime,
            slotEndTime: booking.slotEndTime,
            customerName: booking.customerName,
            customerEmail: booking.customerEmail,
            customerPhone: booking.customerPhone,
            topicTitle: booking.Topic?.title || 'Termin',
            topicDescription: booking.Topic?.description || '',
            durationMinutes: booking.Topic?.durationMinutes || 0,
            expertName: booking.Provider?.displayName || 'Experte',
            location: booking.Provider?.location || 'Keine Angabe',
            providerId,
            topicId
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/public/cancel
router.post('/cancel', async (req, res) => {
    try {
        const { token, reasonType, customReason, reason } = req.body;
        const { Op } = require('sequelize');

        const booking = await Booking.findOne({
            where: {
                [Op.or]: [
                    { cancellationToken: token },
                    { providerCancellationToken: token }
                ]
            },
            include: [
                { model: Topic },
                { model: User, as: 'Provider' }
            ]
        });

        if (!booking) return res.status(404).json({ error: 'Buchung nicht gefunden.' });
        if (booking.status === 'cancelled') return res.status(400).json({ error: 'Dieser Termin wurde bereits storniert.' });

        // Check if caller is authenticated as provider or admin
        let loggedInUserId = null;
        let isAdmin = false;
        const authHeader = req.headers['authorization'];
        const bearerToken = authHeader && authHeader.split(' ')[1];
        if (bearerToken) {
            try {
                const jwt = require('jsonwebtoken');
                const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_change_me';
                const decoded = jwt.verify(bearerToken, JWT_SECRET);
                loggedInUserId = decoded.id;
                isAdmin = decoded.isAdmin;
            } catch (e) {
                // Ignore invalid tokens
            }
        }

        let effectiveRole = 'customer';
        if (booking.providerCancellationToken && booking.providerCancellationToken === token) {
            effectiveRole = 'provider';
        } else if (req.body.role === 'provider' || req.query.role === 'provider') {
            effectiveRole = 'provider';
        } else if (loggedInUserId && (loggedInUserId === booking.providerId || isAdmin)) {
            effectiveRole = 'provider';
        }
        let cancellationReasonText = '';

        if (effectiveRole === 'provider') {
            if (reasonType === 'no_show') {
                cancellationReasonText = 'Kunde ist nicht zum Termin erschienen';
            } else if (reasonType === 'sick') {
                cancellationReasonText = 'Anbieter krankheitsbedingt verhindert';
            } else {
                cancellationReasonText = (customReason || reason) ? ('Sonstiges: ' + (customReason || reason)) : 'Storniert durch Anbieter';
            }
        } else {
            // Customer cancellation
            if (reasonType === 'wrongly_booked') {
                cancellationReasonText = 'Fälschlicherweise gebucht';
            } else if (reasonType === 'wrong_date_time') {
                cancellationReasonText = 'Falsches Datum / Uhrzeit gewählt';
            } else if (reasonType === 'sick_customer' || reasonType === 'sick') {
                cancellationReasonText = 'Krank';
            } else if (reasonType === 'other') {
                cancellationReasonText = (customReason || reason) ? ('Sonstiges: ' + (customReason || reason)) : 'Sonstiges';
            } else {
                cancellationReasonText = customReason || reason || 'Storniert durch Kunde';
            }
        }

        booking.status = 'cancelled';
        booking.cancellationReason = cancellationReasonText;
        await booking.save();

        await mailService.sendCancellation(booking, {
            cancelledBy: effectiveRole,
            reasonType,
            customReason: customReason || reason
        }).catch(console.error);

        res.json({ success: true, booking });
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
