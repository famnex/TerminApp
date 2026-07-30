const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { authenticateLDAP } = require('../utils/ldap');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_change_me';

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Try to find user in local DB
        let user = await User.findOne({ where: { username } });
        let localAuthSuccess = false;

        // Try local authentication first if a local password exists
        if (user && user.password && user.password.trim() !== '') {
            const match = await bcrypt.compare(password, user.password);
            if (match) {
                localAuthSuccess = true;
                if (user.authMethod !== 'local') {
                    user.authMethod = 'local';
                    await user.save();
                    console.log(`Login: '${username}' logged in locally. Auth method updated to local.`);
                }
            }
        }

        if (user && localAuthSuccess) {
            // Local login successful, user is already loaded
        } else {
            // Fallback to LDAP Auth
            console.log(`Login: Attempting LDAP Auth for '${username}'...`);
            const ldapUser = await authenticateLDAP(username, password);

            if (ldapUser) {
                console.log(`Login: LDAP Auth Success for '${username}' (DN: ${ldapUser.dn})`);
                // LDAP Success! Auto-Provision or Sync User
                if (!user) {
                    console.log(`Auto-Provisioning new LDAP user: ${username}`);
                    user = await User.create({
                        username: username,
                        displayName: ldapUser.displayName || ldapUser.cn || username,
                        email: ldapUser.mail,
                        authMethod: 'ldap',
                        isAdmin: false // Default to standard user
                    });
                } else {
                    // Update existing user with latest info from LDAP, but do NOT overwrite displayName
                    let needsSave = false;
                    if (user.authMethod !== 'ldap') {
                        user.authMethod = 'ldap';
                        needsSave = true;
                    }
                    if (ldapUser.mail && user.email !== ldapUser.mail) {
                        user.email = ldapUser.mail;
                        needsSave = true;
                    }
                    if (needsSave) await user.save();
                }
            } else {
                console.log(`Login Failed: Local & LDAP Auth failed for '${username}'.`);
                return res.status(401).json({ error: 'Ungültige Zugangsdaten' });
            }
        }

        // Generate Token
        const token = jwt.sign(
            { id: user.id, username: user.username, isAdmin: user.isAdmin },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                displayName: user.displayName,
                isAdmin: user.isAdmin
            }
        });

    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: 'Server Fehler beim Login' });
    }
});

// GET /api/auth/me (Verify user)
router.get('/me', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const { Department } = require('../models');
        const user = await User.findByPk(decoded.id, {
            attributes: ['id', 'username', 'displayName', 'isAdmin', 'email', 'position', 'location', 'profileImage', 'showEmail'],
            include: [{ model: Department, attributes: ['id', 'name'], through: { attributes: [] } }]
        });

        if (!user) return res.status(404).json({ error: 'User not found' });
        
        // Pass the isSso flag from decoded token down to the client
        const userJson = user.toJSON();
        userJson.isSso = !!decoded.isSso;

        res.json(userJson);
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// POST /api/auth/sso (Login via SSO JWT)
router.post('/sso', async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ error: 'SSO Token fehlt' });
        }

        const { GlobalSettings } = require('../models');
        const ssoEnabledSetting = await GlobalSettings.findByPk('sso_enabled');
        const ssoSecretSetting = await GlobalSettings.findByPk('sso_jwt_secret');

        const ssoEnabled = ssoEnabledSetting && (ssoEnabledSetting.value === 'true' || ssoEnabledSetting.value === true || ssoEnabledSetting.value === '1' || ssoEnabledSetting.value === 1);
        if (!ssoEnabled) {
            return res.status(400).json({ error: 'SSO ist deaktiviert' });
        }

        const ssoSecret = ssoSecretSetting ? ssoSecretSetting.value : null;
        if (!ssoSecret) {
            return res.status(500).json({ error: 'SSO-JWT-Geheimnis ist nicht konfiguriert' });
        }

        let decoded;
        try {
            // Allow 5 minutes clock tolerance to prevent fails due to clock drift on tight token expirations (e.g. 1 minute)
            decoded = jwt.verify(token, ssoSecret, { clockTolerance: 300 });
        } catch (jwtErr) {
            console.error('SSO JWT Verification failed:', jwtErr.message);
            return res.status(401).json({ error: 'Ungültiges SSO-Token: ' + jwtErr.message });
        }

        const username = decoded.username || decoded.sub;
        if (!username) {
            return res.status(400).json({ error: 'SSO-Token enthält keinen gültigen Benutzernamen (username/sub)' });
        }

        let displayName = decoded.displayName || 
                          decoded.name || 
                          decoded.cn || 
                          (decoded.given_name && decoded.family_name ? `${decoded.given_name} ${decoded.family_name}` : null) || 
                          username;

        // Heuristic: If displayName is same as username and contains a dot (e.g. s.fleischer), format it as S. Fleischer
        if (displayName === username && username.includes('.')) {
            displayName = username
                .split('.')
                .map(part => part.charAt(0).toUpperCase() + part.slice(1))
                .join(' ');
        }

        const email = decoded.email || null;
        const isAdmin = decoded.isAdmin || decoded.admin || (decoded.role === 'admin') || false;
        const userGroups = decoded.groups || [];

        // Check if user is allowed by Group Filter
        const groupFilterSetting = await GlobalSettings.findByPk('ldap_groupFilter');
        const groupFilter = groupFilterSetting ? groupFilterSetting.value : null;

        const matchesGroupFilter = (groupsList, filter) => {
            if (!filter || filter.trim() === '') return true; // Empty filter = allowed
            if (!groupsList || !Array.isArray(groupsList)) return false;

            // Extract DN part if formatted like "(memberOf=CN=Lehrer,OU=Groups,DC=schule,DC=local)"
            let targetDN = filter;
            const memberOfMatch = filter.match(/memberOf=([^)]+)/i);
            if (memberOfMatch) {
                targetDN = memberOfMatch[1];
            }
            targetDN = targetDN.replace(/[()]/g, '').trim().toLowerCase();

            return groupsList.some(g => {
                const groupStr = g.toLowerCase();
                if (groupStr === targetDN) return true;
                if (targetDN.startsWith('cn=')) {
                    return groupStr.includes(targetDN);
                } else {
                    return groupStr.includes(`cn=${targetDN}`) || groupStr === targetDN;
                }
            });
        };

        if (!matchesGroupFilter(userGroups, groupFilter)) {
            console.log(`SSO Login: User '${username}' not allowed by group filter '${groupFilter}'.`);
            return res.json({
                success: false,
                notAllowed: true,
                user: {
                    displayName,
                    email
                }
            });
        }

        // Find or create user
        let user = await User.findOne({ where: { username } });
        if (!user) {
            console.log(`Auto-provisioning new SSO user: ${username}`);
            user = await User.create({
                username,
                displayName,
                email,
                authMethod: 'sso',
                isAdmin: isAdmin
            });
        } else {
            // Update existing user attributes if they changed, but do NOT overwrite displayName
            let needsSave = false;
            if (user.authMethod !== 'sso') {
                user.authMethod = 'sso';
                needsSave = true;
            }
            if (email && user.email !== email) {
                user.email = email;
                needsSave = true;
            }
            if (decoded.isAdmin !== undefined && user.isAdmin !== isAdmin) {
                user.isAdmin = isAdmin;
                needsSave = true;
            }
            if (needsSave) {
                await user.save();
            }
        }

        // Generate app session token with isSso: true
        const appToken = jwt.sign(
            { id: user.id, username: user.username, isAdmin: user.isAdmin, isSso: true },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            success: true,
            token: appToken,
            user: {
                id: user.id,
                username: user.username,
                displayName: user.displayName,
                email: user.email,
                isAdmin: user.isAdmin,
                isSso: true
            }
        });

    } catch (err) {
        console.error('SSO Login Route Error:', err);
        res.status(500).json({ error: 'Serverfehler bei der SSO-Anmeldung' });
    }
});

// PUT /api/auth/profile (Update current user's profile)
router.put('/profile', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findByPk(decoded.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const { displayName, email, position, location, profileImage, showEmail, departmentId } = req.body;

        // Update basic info
        user.displayName = displayName || user.displayName;
        user.email = email || user.email;
        user.position = position !== undefined ? position : user.position;
        user.location = location !== undefined ? location : user.location;
        if (profileImage !== undefined) user.profileImage = profileImage;
        if (showEmail !== undefined) user.showEmail = showEmail;

        await user.save();

        // Update department association
        if (departmentId !== undefined) {
            const { Department, BatchConfig, Topic, Availability } = require('../models');
            
            // Get current user's departments to find changes
            const currentDepts = await user.getDepartments({ attributes: ['id'] });
            const currentDeptIds = currentDepts.map(d => d.id);
            
            const targetDeptId = parseInt(departmentId) || null;
            const newDeptIds = targetDeptId ? [targetDeptId] : [];

            // Set new departments
            await user.setDepartments(newDeptIds);

            // Sync logic if user changed their department
            const addedDeptIds = newDeptIds.filter(id => !currentDeptIds.includes(id));
            const removedDeptIds = currentDeptIds.filter(id => !newDeptIds.includes(id));

            // Sync BatchConfigs for newly added department
            for (const deptId of addedDeptIds) {
                const batchConfigs = await BatchConfig.findAll({
                    where: { targetType: 'department', applyToFuture: true },
                    include: [{ model: Department, where: { id: deptId }, required: true }]
                });

                for (const batch of batchConfigs) {
                    const Model = batch.type === 'topic' ? Topic : Availability;
                    // Check if already created
                    const exists = await Model.findOne({ where: { userId: user.id, batchConfigId: batch.id } });
                    if (!exists) {
                        await Model.create({
                            ...batch.configData,
                            userId: user.id,
                            batchConfigId: batch.id
                        });
                    }
                }
            }

            // Sync BatchConfigs for removed departments
            for (const deptId of removedDeptIds) {
                const batchConfigs = await BatchConfig.findAll({
                    where: { targetType: 'department', applyToFuture: true },
                    include: [{ model: Department, where: { id: deptId }, required: true }]
                });

                for (const batch of batchConfigs) {
                    // Check if user is still in another department that has this batch config
                    const userDepts = await user.getDepartments({
                        include: [{ model: Department, include: [{ model: BatchConfig, where: { id: batch.id } }] }]
                    });
                    const stillCovered = userDepts.some(d => d.BatchConfigs && d.BatchConfigs.length > 0);

                    if (!stillCovered) {
                        const Model = batch.type === 'topic' ? Topic : Availability;
                        await Model.destroy({ where: { userId: user.id, batchConfigId: batch.id } });
                    }
                }
            }
        }

        // Reload user with new associations
        const reloadedUser = await User.findByPk(user.id, {
            attributes: ['id', 'username', 'displayName', 'isAdmin', 'email', 'position', 'location', 'profileImage', 'showEmail'],
            include: [{ model: Department, attributes: ['id', 'name'], through: { attributes: [] } }]
        });

        res.json({ success: true, user: reloadedUser });
    } catch (err) {
        console.error('Profile Update Error:', err);
        res.status(500).json({ error: 'Server Fehler beim Aktualisieren des Profils: ' + err.message });
    }
});

// POST /api/auth/upload-image (Upload profile image for any logged-in user)
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
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

router.post('/upload-image', (req, res, next) => {
    // Authenticate token manually
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    try {
        jwt.verify(token, JWT_SECRET);
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Keine Datei hochgeladen' });
        }
        const relativePath = 'uploads/' + req.file.filename;
        res.json({ success: true, path: relativePath });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
