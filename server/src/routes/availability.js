const express = require('express');
const router = express.Router();
const { Availability } = require('../models');

// GET /api/availability/mine
router.get('/mine', async (req, res) => {
    try {
        const userId = req.user.id; // From auth middleware (req.user set by jwt)
        const availabilities = await Availability.findAll({
            where: { userId }
        });
        res.json(availabilities);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/availability
router.post('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const { type, dayOfWeek, specificDate, startTime, endTime, validUntil } = req.body;

        const availability = await Availability.create({
            userId,
            type,
            dayOfWeek, // 0-6
            specificDate, // "YYYY-MM-DD"
            startTime, // "HH:mm"
            endTime,   // "HH:mm"
            validUntil // "YYYY-MM-DD" or null
        });

        res.status(201).json(availability);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/availability/:id
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const deleted = await Availability.destroy({
            where: { id, userId }
        });

        if (!deleted) return res.status(404).json({ error: 'Availability not found' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
