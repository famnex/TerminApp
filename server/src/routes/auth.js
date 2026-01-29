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
        res.json(user);
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

module.exports = router;
