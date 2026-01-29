const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

router.get('/', (req, res) => {
    try {
        const packageJsonPath = path.join(__dirname, '../../package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        res.json({ version: packageJson.version });
    } catch (error) {
        console.error('Error reading version:', error);
        res.status(500).json({ error: 'Could not determine version' });
    }
});

module.exports = router;
