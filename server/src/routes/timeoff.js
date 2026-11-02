const express = require('express');
const router = express.Router();
const { TimeOff } = require('../models');
const { Op } = require('sequelize');

// GET /api/timeoff/mine (Returns personal time-offs and central/global time-offs)
// Hides completely past time-offs by default unless includePast=true is specified
router.get('/mine', async (req, res) => {
    try {
        const userId = req.user.id;
        const includePast = req.query.includePast === 'true';

        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        const whereClause = {
            [Op.or]: [
                { userId },
                { userId: null }
            ]
        };

        if (!includePast) {
            whereClause.endDate = {
                [Op.gte]: todayStr
            };
        }

        const timeOffs = await TimeOff.findAll({
            where: whereClause,
            order: [['startDate', 'ASC']]
        });
        res.json(timeOffs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/timeoff (Create personal or admin central time-off)
router.post('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const { startDate, endDate, reason, isGlobal } = req.body;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Start- und Enddatum sind erforderlich.' });
        }

        let targetUserId = userId;
        if (isGlobal) {
            if (!req.user.isAdmin) {
                return res.status(403).json({ error: 'Nur Administratoren können zentrale Abwesenheiten für alle festlegen.' });
            }
            targetUserId = null;
        }

        const timeOff = await TimeOff.create({
            userId: targetUserId,
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

        const timeOff = await TimeOff.findByPk(id);
        if (!timeOff) {
            return res.status(404).json({ error: 'Eintrag nicht gefunden.' });
        }

        // Central time-offs can only be deleted by admins
        if (timeOff.userId === null) {
            if (!req.user.isAdmin) {
                return res.status(403).json({ error: 'Nur Administratoren können zentrale Abwesenheiten löschen.' });
            }
        } else if (timeOff.userId !== userId && !req.user.isAdmin) {
            return res.status(403).json({ error: 'Keine Berechtigung zum Löschen dieser Abwesenheit.' });
        }

        await timeOff.destroy();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
