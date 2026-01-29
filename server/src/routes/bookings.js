const express = require('express');
const router = express.Router();
const { Booking, Topic, User } = require('../models');
const mailService = require('../services/mail');

// GET /api/bookings/mine
router.get('/mine', async (req, res) => {
    try {
        const userId = req.user.id;

        // Find bookings where the logged-in user is the provider (via User -> Booking directly, or Topic)
        // Since we might have missed populating providerId in public.js, we'll include Topic to filter

        const isArchived = req.query.archived === 'true';

        // Fetch all bookings where providerId matches (provider)
        const bookings = await Booking.findAll({
            where: {
                providerId: userId,
                isArchived: isArchived
            },
            include: [Topic],
            order: [['slotStartTime', 'ASC']]
        });

        res.json(bookings);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/bookings/:id/cancel
router.post('/:id/cancel', async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { reason } = req.body;

        const booking = await Booking.findByPk(id, {
            include: [Topic]
        });

        if (!booking) return res.status(404).json({ error: 'Booking not found' });

        // Check ownership
        if (booking.Topic.userId !== userId && !req.user.isAdmin) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        if (booking.status === 'cancelled') return res.status(400).json({ error: 'Already cancelled' });

        booking.status = 'cancelled';
        booking.cancellationReason = reason || 'Cancelled by provider';
        await booking.save();

        await mailService.sendCancellation(booking).catch(console.error);

        res.json({ success: true, booking });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/bookings/:id
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const booking = await Booking.findByPk(id, {
            include: [Topic]
        });

        if (!booking) return res.status(404).json({ error: 'Booking not found' });

        // Check ownership (Provider or Admin)
        const isProvider = booking.Topic && booking.Topic.userId === userId;
        if (!isProvider && !req.user.isAdmin) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        await booking.destroy();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/bookings/:id/archive
router.post('/:id/archive', async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const booking = await Booking.findByPk(id);
        if (!booking) return res.status(404).json({ error: 'Booking not found' });

        if (booking.providerId !== userId && !req.user.isAdmin) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        booking.isArchived = true;
        await booking.save();

        res.json({ success: true, message: 'Archived' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/bookings/:id/unarchive
router.post('/:id/unarchive', async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const booking = await Booking.findByPk(id);
        if (!booking) return res.status(404).json({ error: 'Booking not found' });

        if (booking.providerId !== userId && !req.user.isAdmin) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        booking.isArchived = false;
        await booking.save();

        res.json({ success: true, message: 'Unarchived' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
