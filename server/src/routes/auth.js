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

        // If user exists and is configured for LOCAL auth, verify password locally
        if (user && user.authMethod === 'local') {
            const match = await bcrypt.compare(password, user.password);
            if (!match) {
                console.log(`Login Failed: Local user '${username}' invalid password.`);
                return res.status(401).json({ error: 'Ungültige Zugangsdaten' });
            }
        } else {
            // User does not exist OR is not 'local' -> Attempt LDAP Auth
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
                    // Update existing user with latest info from LDAP
                    let needsSave = false;
                    if (user.displayName !== (ldapUser.displayName || ldapUser.cn)) {
                        user.displayName = ldapUser.displayName || ldapUser.cn || username;
                        needsSave = true;
                    }
                    if (ldapUser.mail && user.email !== ldapUser.mail) {
                        user.email = ldapUser.mail;
                        needsSave = true;
                    }
                    if (needsSave) await user.save();
                }
            } else {
                console.log(`Login Failed: LDAP Auth failed for '${username}'.`);
                // LDAP Failed
                // If user existed (but was LDAP auth), or didn't exist -> Invalid Credentials
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
        const user = await User.findByPk(decoded.id, {
            attributes: ['id', 'username', 'displayName', 'isAdmin', 'email']
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

        const ssoEnabled = ssoEnabledSetting && (ssoEnabledSetting.value === 'true' || ssoEnabledSetting.value === true);
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

        const displayName = decoded.displayName || decoded.name || username;
        const email = decoded.email || null;
        const isAdmin = decoded.isAdmin || decoded.admin || (decoded.role === 'admin') || false;

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
            // Update existing user attributes if they changed
            let needsSave = false;
            if (user.displayName !== displayName) {
                user.displayName = displayName;
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
                isAdmin: user.isAdmin,
                isSso: true
            }
        });

    } catch (err) {
        console.error('SSO Login Route Error:', err);
        res.status(500).json({ error: 'Serverfehler bei der SSO-Anmeldung' });
    }
});

module.exports = router;
