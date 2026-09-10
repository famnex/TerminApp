const express = require('express');
const router = express.Router();
const { Availability, Topic } = require('../models');

// GET /api/availability/mine
router.get('/mine', async (req, res) => {
    try {
        const userId = req.user.id;
        const availabilities = await Availability.findAll({
            where: { userId },
            include: [{ model: Topic, through: { attributes: [] }, attributes: ['id', 'title'] }]
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
        const { type, dayOfWeek, specificDate, startTime, endTime, validUntil, topicIds } = req.body;

        const availability = await Availability.create({
            userId,
            type,
            dayOfWeek, // 0-6
            specificDate, // "YYYY-MM-DD"
            startTime, // "HH:mm"
            endTime,   // "HH:mm"
            validUntil: validUntil || null
        });

        if (Array.isArray(topicIds) && topicIds.length > 0) {
            await availability.setTopics(topicIds);
        }

        const fullAvailability = await Availability.findByPk(availability.id, {
            include: [{ model: Topic, through: { attributes: [] }, attributes: ['id', 'title'] }]
        });

        res.status(201).json(fullAvailability);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/availability/:id
router.put('/:id', async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { type, dayOfWeek, specificDate, startTime, endTime, validUntil, topicIds } = req.body;

        const availability = await Availability.findOne({ where: { id, userId } });
        if (!availability) return res.status(404).json({ error: 'Availability not found' });

        if (type !== undefined) availability.type = type;
        if (dayOfWeek !== undefined) availability.dayOfWeek = dayOfWeek;
        if (specificDate !== undefined) availability.specificDate = specificDate;
        if (startTime !== undefined) availability.startTime = startTime;
        if (endTime !== undefined) availability.endTime = endTime;
        if (validUntil !== undefined) availability.validUntil = validUntil || null;

        await availability.save();

        if (Array.isArray(topicIds)) {
            await availability.setTopics(topicIds);
        }

        const fullAvailability = await Availability.findByPk(availability.id, {
            include: [{ model: Topic, through: { attributes: [] }, attributes: ['id', 'title'] }]
        });

        res.json(fullAvailability);
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
