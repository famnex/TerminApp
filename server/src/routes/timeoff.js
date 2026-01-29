const express = require('express');
const router = express.Router();
const { TimeOff } = require('../models');

// GET /api/timeoff/mine
router.get('/mine', async (req, res) => {
    try {
        const userId = req.user.id;
        const timeOffs = await TimeOff.findAll({
            where: { userId },
            order: [['startDate', 'ASC']]
        });
        res.json(timeOffs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/timeoff
router.post('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const { startDate, endDate, reason } = req.body;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Start- und Enddatum sind erforderlich.' });
        }

        const timeOff = await TimeOff.create({
            userId,
            startDate,
            endDate,
            reason
        });

        res.status(201).json(timeOff);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/timeoff/:id
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const deleted = await TimeOff.destroy({
            where: { id, userId }
        });

        if (!deleted) return res.status(404).json({ error: 'Eintrag nicht gefunden.' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
