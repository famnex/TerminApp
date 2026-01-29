const express = require('express');
const router = express.Router();
const { Topic } = require('../models');

// GET /api/topics/mine
router.get('/mine', async (req, res) => {
    try {
        const userId = req.user.id;
        const topics = await Topic.findAll({
            where: { userId }
        });
        res.json(topics);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/topics
router.post('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const { title, durationMinutes, description } = req.body;

        const topic = await Topic.create({
            userId,
            title,
            durationMinutes,
            description
        });

        res.status(201).json(topic);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/topics/:id
router.put('/:id', async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { title, durationMinutes, description } = req.body;

        const topic = await Topic.findOne({ where: { id, userId } });
        if (!topic) return res.status(404).json({ error: 'Topic not found' });

        topic.title = title || topic.title;
        topic.durationMinutes = durationMinutes || topic.durationMinutes;
        topic.description = description || topic.description;

        await topic.save();
        res.json(topic);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/topics/:id
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const deleted = await Topic.destroy({
            where: { id, userId }
        });

        if (!deleted) return res.status(404).json({ error: 'Topic not found' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
