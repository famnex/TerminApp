const express = require('express');
const router = express.Router();
const { GlobalSettings, User, BatchConfig, Topic, Availability, Department } = require('../models');
const { requireAdmin } = require('../middleware/auth');

// Apply requireAdmin middleware to all routes in this router
// Note: authenticateToken is already applied in index.js for /api/admin
router.use(requireAdmin);

// GET Users
router.get('/users', async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'username', 'displayName', 'email', 'isAdmin', 'authMethod', 'position', 'profileImage', 'showEmail', 'location']
        });
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST Create User
router.post('/users', async (req, res) => {
    try {
        const { username, password, displayName, email, isAdmin, authMethod } = req.body;

        // Validation could go here

        const newUser = await User.create({
            username,
            password, // Hook in model handles hashing
            displayName,
            email,
            isAdmin: isAdmin || false,
            authMethod: authMethod || 'local'
        });

        res.status(201).json({
            success: true,
            user: {
                id: newUser.id,
                username: newUser.username,
                displayName: newUser.displayName
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT Update User
router.put('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { displayName, email, isAdmin, password } = req.body;

        const user = await User.findByPk(id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Update fields
        user.displayName = displayName || user.displayName;
        user.email = email || user.email;
        if (isAdmin !== undefined) user.isAdmin = isAdmin;

        // New Profile Fields
        user.position = req.body.position; // Allow empty string to clear
        user.location = req.body.location;
        if (req.body.profileImage !== undefined) user.profileImage = req.body.profileImage;
        if (req.body.showEmail !== undefined) user.showEmail = req.body.showEmail;

        // If password provided, hash it manually because beforeCreate might not trigger on update depending on implementation
        // But our model hook is beforeCreate. We need to handle password update carefully.
        // Let's implement manual hashing here to be safe and explicit.
        if (password && password.trim() !== '') {
            const bcrypt = require('bcrypt');
            user.password = await bcrypt.hash(password, 10);
        }

        await user.save();

        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET Settings
router.get('/settings', async (req, res) => {
    try {
        const settings = await GlobalSettings.findAll();
        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST Update Setting
router.post('/settings', async (req, res) => {
    try {
        const { key, value } = req.body;
        await GlobalSettings.upsert({ key, value });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE User
router.delete('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id);

        if (!user) return res.status(404).json({ error: 'User not found' });

        // Optional: Prevent deleting self
        // if (req.user.id === parseInt(id)) return res.status(400).json({ error: 'Cannot delete yourself' });

        await user.destroy();
        res.json({ success: true, message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/admin/ldap-test
const { testLdapConnection } = require('../utils/ldap');
router.post('/ldap-test', async (req, res) => {
    try {
        const { config, username, password } = req.body;
        // config contains: ldap_url, ldap_bindDN, ldap_bindCredentials, etc.

        const user = await testLdapConnection(config, username, password);

        // Return success and found user attributes to verify mapping
        res.json({
            success: true,
            message: 'Verbindung erfolgreich!',
            user: {
                dn: user.dn,
                cn: user.cn,
                sAMAccountName: user.sAMAccountName,
                mail: user.mail,
                displayName: user.displayName
            }
        });
    } catch (err) {
        console.error('LDAP Test Failed:', err);
        res.status(400).json({
            success: false,
            error: err.message || 'LDAP Verbindung fehlgeschlagen',
            details: JSON.stringify(err, Object.getOwnPropertyNames(err), 2) // Serialize error object including stack
        });
    }
});

// Configure Multer for Logo Upload
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads'); // Store in server/uploads
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir)
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error("Nur Bilder erlaubt!"));
    }
});

// POST /api/admin/upload-logo
router.post('/upload-logo', upload.single('logo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Keine Datei hochgeladen' });
        }

        const relativePath = 'uploads/' + req.file.filename;

        // Update Setting
        await GlobalSettings.upsert({ key: 'school_logo', value: relativePath });

        res.json({ success: true, path: relativePath });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/admin/upload-user-image
router.post('/upload-user-image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Keine Datei hochgeladen' });
        }

        const relativePath = 'uploads/' + req.file.filename;
        res.json({ success: true, path: relativePath });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/admin/smtp-test
const nodemailer = require('nodemailer');
router.post('/smtp-test', async (req, res) => {
    try {
        const { config, recipient } = req.body;

        // Convert port to number if string
        const smtpPort = parseInt(config.smtp_port) || 587;

        // Auto-fix: Port 587 is usually STARTTLS (secure: false), Port 465 is SSL (secure: true)
        // If user enabled SSL but uses port 587, force secure: false to avoid "wrong version number" error.
        // Nodemailer will still upgrade to TLS via STARTTLS if available.
        let isSecure = config.smtp_secure === 'true' || config.smtp_secure === true;

        if (smtpPort === 587 && isSecure) {
            console.log('Adjustment: Forcing secure=false for Port 587 (STARTTLS)');
            isSecure = false;
        }

        let transporter = nodemailer.createTransport({
            host: config.smtp_host,
            port: smtpPort,
            secure: isSecure,
            auth: {
                user: config.smtp_user,
                pass: config.smtp_pass,
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        const info = await transporter.sendMail({
            from: `"${config.smtp_from_name || 'System'}" <${config.smtp_from_email || config.smtp_user}>`,
            to: recipient,
            subject: "Test E-Mail ✔",
            text: "Das ist eine Test-Nachricht vom Terminsystem.",
            html: "<b>Das ist eine Test-Nachricht vom Terminsystem.</b><br>Die SMTP-Verbindung funktioniert erfolgreich."
        });

        res.json({ success: true, message: 'E-Mail gesendet: ' + info.messageId });
    } catch (err) {
        console.error('SMTP Test Failed:', err);
        res.status(400).json({ error: err.message || 'SMTP Fehler' });
    }
});

// --- Batch Processing Routes ---

// GET /api/admin/batch
router.get('/batch', async (req, res) => {
    try {
        const batches = await BatchConfig.findAll({
            include: [{
                model: Department,
                attributes: ['id', 'name'],
                through: { attributes: [] }
            }],
            order: [['createdAt', 'DESC']]
        });

        // Enhance with userIds (for legacy/user-specific rules)
        const enhancedBatches = await Promise.all(batches.map(async (batch) => {
            let userIds = [];
            // If it's a user-based rule, fetch the explicit userIds
            if (batch.targetType === 'user') {
                if (batch.type === 'topic') {
                    const topics = await Topic.findAll({ where: { batchConfigId: batch.id }, attributes: ['userId'] });
                    userIds = topics.map(t => t.userId);
                } else if (batch.type === 'availability') {
                    const avails = await Availability.findAll({ where: { batchConfigId: batch.id }, attributes: ['userId'] });
                    userIds = avails.map(a => a.userId);
                }
            }
            return { ...batch.toJSON(), userIds };
        }));

        res.json(enhancedBatches);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/admin/batch
router.post('/batch', async (req, res) => {
    try {
        const { name, type, configData, userIds, departmentIds, applyToFuture, targetType = 'user' } = req.body;

        // 1. Create Batch Config
        const batch = await BatchConfig.create({
            name,
            type,
            targetType,
            configData,
            applyToFuture: applyToFuture || false
        });

        let usersToApply = [];

        // 2. Determine Users
        if (targetType === 'department' && departmentIds && departmentIds.length > 0) {
            // Link Departments
            await batch.setDepartments(departmentIds);

            // Fetch users in these departments
            const departments = await Department.findAll({
                where: { id: departmentIds },
                include: [{ model: User }]
            });

            // Flatten and distinct users
            const userMap = new Map();
            departments.forEach(dept => {
                dept.Users.forEach(u => userMap.set(u.id, u.id));
            });
            usersToApply = Array.from(userMap.values());

        } else if (targetType === 'user' && userIds && userIds.length > 0) {
            usersToApply = userIds;
        }

        // 3. Create Items
        if (usersToApply.length > 0) {
            const Model = type === 'topic' ? Topic : Availability;
            const items = usersToApply.map(userId => ({
                ...configData,
                userId,
                batchConfigId: batch.id
            }));
            await Model.bulkCreate(items);
        }

        res.status(201).json({ success: true, batch });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/admin/batch/:id
router.put('/batch/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, configData, applyToFuture, userIds, departmentIds, targetType } = req.body;

        const batch = await BatchConfig.findByPk(id);
        if (!batch) return res.status(404).json({ error: 'Batch rule not found' });

        // Update Batch Config
        batch.name = name || batch.name;
        batch.configData = configData || batch.configData;
        if (applyToFuture !== undefined) batch.applyToFuture = applyToFuture;
        if (targetType) batch.targetType = targetType;
        await batch.save();

        const Model = batch.type === 'topic' ? Topic : Availability;

        // Propagate changes to existing items (content update)
        await Model.update(configData, { where: { batchConfigId: id } });

        // --- Sync Targets Logic ---
        let finalUserIds = [];

        if (batch.targetType === 'department') {
            if (departmentIds) {
                await batch.setDepartments(departmentIds);
            }

            // Refetch departments to get current list (if departmentIds was undefined, we keep existing)
            const currentDepartments = await batch.getDepartments({ include: [User] });

            const userMap = new Map();
            currentDepartments.forEach(dept => {
                dept.Users.forEach(u => userMap.set(u.id, u.id));
            });
            finalUserIds = Array.from(userMap.values());

        } else {
            // User mode
            if (userIds) finalUserIds = userIds;
            else {
                // If userIds not sent, assumes no change to selection? 
                // Ideally frontend sends current list. If partial update, we might have issues.
                // For simplicity, let's assume frontend sends full list if targetType is user.
            }
        }

        // Now Sync Items (Common Logic)
        if (finalUserIds.length > 0 || (batch.targetType === 'user' && userIds)) {
            // 1. Get current users linked to this batch
            const currentItems = await Model.findAll({ where: { batchConfigId: id }, attributes: ['userId'] });
            const currentUserIds = currentItems.map(item => item.userId);

            // 2. Identify Added and Removed
            const usersToAdd = finalUserIds.filter(uid => !currentUserIds.includes(uid));
            const usersToRemove = currentUserIds.filter(uid => !finalUserIds.includes(uid));

            // 3. Remove Items
            if (usersToRemove.length > 0) {
                await Model.destroy({
                    where: {
                        batchConfigId: id,
                        userId: usersToRemove
                    }
                });
            }

            // 4. Add Items
            if (usersToAdd.length > 0) {
                const newItems = usersToAdd.map(userId => ({
                    ...configData,
                    userId,
                    batchConfigId: batch.id
                }));
                await Model.bulkCreate(newItems);
            }
        }

        res.json({ success: true, batch });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/admin/batch/:id
router.delete('/batch/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const batch = await BatchConfig.findByPk(id);

        if (!batch) return res.status(404).json({ error: 'Batch rule not found' });

        await batch.destroy();

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});


// --- Department Management Routes ---

// GET /api/admin/departments
router.get('/departments', async (req, res) => {
    try {
        const departments = await Department.findAll({
            include: [{
                model: User,
                attributes: ['id', 'displayName', 'username'],
                through: { attributes: [] } // Avoid including join table data
            }],
            order: [['name', 'ASC']]
        });
        res.json(departments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/admin/departments
router.post('/departments', async (req, res) => {
    try {
        const { name, description, userIds } = req.body;

        const department = await Department.create({ name, description });

        if (userIds && Array.isArray(userIds)) {
            await department.setUsers(userIds);
        }

        // Reload to include users
        const reloaded = await department.reload({
            include: [{ model: User, attributes: ['id', 'displayName', 'username'] }]
        });

        res.status(201).json(reloaded);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/admin/departments/:id
router.put('/departments/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, userIds } = req.body;

        const department = await Department.findByPk(id);
        if (!department) return res.status(404).json({ error: 'Department not found' });

        department.name = name || department.name;
        department.description = description !== undefined ? description : department.description;
        await department.save();

        if (userIds && Array.isArray(userIds)) {
            // Get current users BEFORE update to detect changes
            const currentUsers = await department.getUsers({ attributes: ['id'] });
            const currentUserIds = currentUsers.map(u => u.id);

            // Update association
            await department.setUsers(userIds);

            // --- SYNC LOGIC --- 
            const newUsers = userIds.filter(id => !currentUserIds.includes(id));
            const removedUsers = currentUserIds.filter(id => !userIds.includes(id));

            console.log(`[Dept Sync] Updating Dept ${id}. New: ${newUsers.length}, Removed: ${removedUsers.length}`);

            if (newUsers.length > 0 || removedUsers.length > 0) {
                // Find active Department-Based Batch Configs for this dept
                const batchConfigs = await BatchConfig.findAll({
                    where: { targetType: 'department', applyToFuture: true },
                    include: [{
                        model: Department,
                        where: { id: department.id },
                        required: true
                    }]
                });

                console.log(`[Dept Sync] Found ${batchConfigs.length} active batch configs.`);

                for (const batch of batchConfigs) {
                    console.log(`[Dept Sync] Processing Batch ${batch.id} (${batch.name})`);
                    const Model = batch.type === 'topic' ? Topic : Availability;

                    // ADD Rules to New Users
                    if (newUsers.length > 0) {
                        const items = newUsers.map(userId => ({
                            ...batch.configData,
                            userId,
                            batchConfigId: batch.id
                        }));
                        await Model.bulkCreate(items);
                        console.log(`[Dept Sync] Added items for ${newUsers.length} users.`);
                    }

                    // REMOVE Rules from Removed Users
                    if (removedUsers.length > 0) {
                        for (const userId of removedUsers) {
                            // Find user's other departments
                            const userDepts = await User.findByPk(userId, {
                                include: [{
                                    model: Department,
                                    include: [{
                                        model: BatchConfig,
                                        where: { id: batch.id }
                                    }]
                                }]
                            });

                            // Check coverage
                            const stillCovered = userDepts && userDepts.Departments && userDepts.Departments.some(d =>
                                d.BatchConfigs && d.BatchConfigs.some(bc => bc.id === batch.id)
                            );

                            console.log(`[Dept Sync] User ${userId} check. Still covered? ${stillCovered}`);

                            if (!stillCovered) {
                                await Model.destroy({
                                    where: {
                                        batchConfigId: batch.id,
                                        userId: userId
                                    }
                                });
                                console.log(`[Dept Sync] Destroyed items for user ${userId}`);
                            }
                        }
                    }
                }
            }
        }

        // Reload to include users
        const reloaded = await department.reload({
            include: [{ model: User, attributes: ['id', 'displayName', 'username'] }]
        });

        res.json(reloaded);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/admin/departments/:id
router.delete('/departments/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const department = await Department.findByPk(id);
        if (!department) return res.status(404).json({ error: 'Department not found' });

        await department.destroy();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
