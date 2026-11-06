const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { User, GlobalSettings } = require('../models');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();
const { defaults, validateLayout } = require('../config/nameBadgeLayout');
const read = async (key, fallback) => {
    const row = await GlobalSettings.findByPk(key);
    return row ? JSON.parse(row.value) : fallback;
};
const save = (key, value) => GlobalSettings.upsert({ key, value: JSON.stringify(value) });
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
router.get('/settings', wrap(async (req, res) => {
    const appUrl = await GlobalSettings.findByPk('app_url');
    res.json({ ...defaults, ...await read('name_badge_settings', {}), appUrl: appUrl?.value || '' });
}));
router.put('/settings', requireAdmin, wrap(async (req, res) => {
    let settings;
    try { settings = validateLayout(req.body); }
    catch (err) { return res.status(400).json({ error: err.message }); }
    await save('name_badge_settings', settings);
    res.json({ success: true });
}));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });
router.post('/logo', requireAdmin, upload.single('logo'), wrap(async (req, res) => {
    const b = req.file?.buffer;
    const png = b && b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    const jpg = b && b[0] === 255 && b[1] === 216 && b[2] === 255;
    if (!png && !jpg) return res.status(400).json({ error: 'Bitte ein PNG- oder JPEG-Bild hochladen.' });
    const dir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
    fs.mkdirSync(dir, { recursive: true });
    const filename = `badge-${crypto.randomUUID()}.${png ? 'png' : 'jpg'}`;
    await fs.promises.writeFile(path.join(dir, filename), b);
    res.json({ path: `uploads/${filename}` });
}));
router.use('/users/:id', wrap(async (req, res, next) => {
    if (String(req.user.id) !== req.params.id && !req.user.isAdmin) return res.sendStatus(403);
    const user = await User.findByPk(req.params.id);
    if (!user) return res.sendStatus(404);
    req.badgeUser = user;
    next();
}));
router.get('/users/:id', wrap(async (req, res) => {
    const user = req.badgeUser;
    res.json({ id: user.id, displayName: user.displayName, bookingPageActive: user.bookingPageActive,
        ...await read(`name_badge_user_${user.id}`, { salutation: 'Herr', position: 'Lehrer' }) });
}));
router.put('/users/:id', wrap(async (req, res) => {
    const { salutation, position } = req.body;
    if (!['Herr', 'Frau'].includes(salutation) || typeof position !== 'string' || !position.trim() || position.trim().length > 100) {
        return res.status(400).json({ error: 'Bitte Anrede und einen Zusatz mit maximal 100 Zeichen angeben.' });
    }
    await save(`name_badge_user_${req.badgeUser.id}`, { salutation, position: position.trim() });
    res.json({ success: true });
}));
router.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    console.error('Name badge:', err);
    res.status(err instanceof multer.MulterError ? 400 : 500).json({ error: err instanceof multer.MulterError ? 'Upload fehlgeschlagen (max. 2 MB).' : 'Namensschild konnte nicht verarbeitet werden.' });
});
module.exports = router;
