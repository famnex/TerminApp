const ActiveDirectory = require('activedirectory2');
const { GlobalSettings } = require('../models');

/**
 * Fetches LDAP configuration from GlobalSettings
 */
async function getLdapConfig() {
    const settings = await GlobalSettings.findAll();
    const config = {};
    settings.forEach(s => config[s.key] = s.value);

    // Helper to check boolean
    const isTrue = (val) => val === 'true' || val === true || val === '1' || val === 1;

    if (!isTrue(config.ldap_enabled)) {
        console.log('LDAP is disabled in settings (ldap_enabled != true).');
        return null;
    }

    let url = config.ldap_url;
    const isSSL = isTrue(config.ldap_ssl);
    // Fix Protocol based on SSL setting
    if (url) {
        if (isSSL && url.startsWith('ldap://')) {
            url = url.replace('ldap://', 'ldaps://');
        } else if (!url.startsWith('ldap://') && !url.startsWith('ldaps://')) {
            url = isSSL ? `ldaps://${url}` : `ldap://${url}`;
        }
    }

    // Append port if specified and not already in URL
    if (config.ldap_port && !url.split('://')[1].includes(':')) {
        url = `${url}:${config.ldap_port}`;
    }

    // TLS Options
    // Force rejectUnauthorized to false if configured, defaulting to false for robustness in internal networks
    const verifyCert = isTrue(config.ldap_verify_cert);
    const tlsOptions = isSSL ? {
        rejectUnauthorized: verifyCert
    } : undefined;

    return {
        url: url,
        baseDN: config.ldap_searchBase,
        username: config.ldap_bindDN,
        password: config.ldap_bindCredentials,
        attributes: {
            user: [
                'dn',
                'cn',
                config.ldap_userAttr || 'sAMAccountName',
                config.ldap_emailAttr || 'mail',
                config.ldap_displayNameAttr || 'displayName'
            ],
        },
        tlsOptions: tlsOptions,
        // Increase timeouts
        connectTimeout: 10000,
        socketTimeout: 10000,
        // Custom property
        ldap_upnSuffix: config.ldap_upnSuffix
    };
}

/**
 * Validates credentials against Active Directory
 * @param {string} username 
 * @param {string} password 
 * @returns {Promise<object|null>} User object if success, null if failed
 */
async function authenticateLDAP(username, password) {
    const config = await getLdapConfig();
    if (!config) return null;

    return new Promise((resolve, reject) => {
        const ad = new ActiveDirectory(config);

        // Ensure username has domain/suffix if configured
        let bindUser = username;
        if (config.ldap_upnSuffix && !bindUser.includes('@')) {
            bindUser = bindUser + config.ldap_upnSuffix;
        }

        console.log(`LDAP Login Attempt: User='${username}', BindUser='${bindUser}'`);

        ad.authenticate(bindUser, password, function (err, auth) {
            if (err) {
                console.error('LDAP Auth Error:', err);
                return resolve(null); // Resolve null to indicate failure instead of throwing
            }

            console.log(`LDAP Auth Result: ${auth}`);

            if (auth) {
                // If authenticated, fetch user details using the search filter (sAMAccountName usually)
                // Note: activeDirectory2 findUser uses the filter (e.g. sAMAccountName=username)
                // We typically search by the raw username (sAMAccountName), NOT the UPN (email).
                // So we pass 'username' (without suffix) to findUser if ldap_userAttr is sAMAccountName.

                ad.findUser(username, function (err, user) {
                    if (err) {
                        console.error('LDAP Find Error:', err);
                        return resolve(null);
                    }
                    if (!user) return resolve(null);

                    resolve(user);
                });
            } else {
                resolve(null);
            }
        });
    });
}

/**
 * Test LDAP Connection with provided config (for the test button)
 */
async function testLdapConnection(testConfig, username, password) {
    return new Promise((resolve, reject) => {
        let url = testConfig.ldap_url;
        const isTrue = (val) => val === 'true' || val === true || val === '1' || val === 1;
        const isSSL = isTrue(testConfig.ldap_ssl);

        if (url) {
            if (isSSL && url.startsWith('ldap://')) {
                url = url.replace('ldap://', 'ldaps://');
            } else if (!url.startsWith('ldap://') && !url.startsWith('ldaps://')) {
                url = isSSL ? `ldaps://${url}` : `ldap://${url}`;
            }
        }

        // ... (port check remains same)

        const adConfig = {
            url: url,
            baseDN: testConfig.ldap_searchBase,
            username: testConfig.ldap_bindDN,
            password: testConfig.ldap_bindCredentials,
            tlsOptions: isSSL ? {
                rejectUnauthorized: isTrue(testConfig.ldap_verify_cert)
            } : undefined,
            connectTimeout: 5000,
            socketTimeout: 5000
        };

        // DEBUG
        console.log('LDAP Config prepared. Testing Service Bind...');

        const ad = new ActiveDirectory(adConfig);

        // STEP 1: Verify Service Account (Bind DN)
        // We do this by searching for the bind user itself (or a dummy).
        // ad.findUser triggers a bind with the service account.
        ad.findUser(testConfig.ldap_bindDN, function (err, result) {
            if (err) {
                console.error('LDAP Service Bind Failed:', err);
                // Distinguish 52e here
                if (err.lde_message && err.lde_message.includes('52e')) {
                    return reject(new Error('SERVICE BIND FAILED: Die Zugangsdaten für den "Bind DN" (Service User) sind falsch.'));
                }
                return reject(err);
            }

            console.log('LDAP Service Bind Successful. Now testing User Authentication...');

            // Normalize Test User
            let bindUser = username;
            if (testConfig.ldap_upnSuffix && !bindUser.includes('@')) {
                bindUser = bindUser + testConfig.ldap_upnSuffix;
            }

            // STEP 2: Authenticate the Test User
            ad.authenticate(bindUser, password, function (err, auth) {
                if (err) {
                    console.error('LDAP User Auth Failed:', err);
                    if (err.lde_message && err.lde_message.includes('52e')) {
                        return reject(new Error('USER AUTH FAILED: Login für den Test-Benutzer fehlgeschlagen. Versuchen Sie "user@domain" oder "DOMAIN\\user".'));
                    }
                    return reject(err);
                }

                if (auth) {
                    ad.findUser(username, function (err, user) {
                        if (err) return reject(err);
                        if (!user) return reject(new Error('User authenticated but object is null'));
                        resolve(user);
                    });
                } else {
                    reject(new Error('Authentication failed (Invalid Credentials for Test User)'));
                }
            });
        });
    });
}

module.exports = { authenticateLDAP, testLdapConnection };
