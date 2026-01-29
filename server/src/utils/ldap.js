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
        rejectUnauthorized: verifyCert,
        minVersion: 'TLSv1'
    } : undefined;

    const adConfig = {
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
        connectTimeout: 20000, // 20s
        socketTimeout: 20000,
        ldap_upnSuffix: config.ldap_upnSuffix
    };

    console.log('--- DEBUG: LDAP CONFIG LOADED ---');
    console.log(`URL: ${adConfig.url}`);
    console.log(`BindDN: ${adConfig.username}`);
    console.log(`BaseDN: ${adConfig.baseDN}`);
    console.log(`SSL: ${isSSL}, VerifyCert: ${verifyCert}`);
    console.log(`TLS Options: ${JSON.stringify(tlsOptions)}`);
    console.log('---------------------------------');

    return adConfig;
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
        console.log(`\n--- LDAP AUTH START: ${username} ---`);
        const ad = new ActiveDirectory(config);

        // Ensure username has domain/suffix if configured
        let bindUser = username;
        if (config.ldap_upnSuffix && !bindUser.includes('@')) {
            bindUser = bindUser + config.ldap_upnSuffix;
        }

        console.log(`Step 1: Authenticating BindUser='${bindUser}'`);

        ad.authenticate(bindUser, password, function (err, auth) {
            if (err) {
                console.error('❌ LDAP Auth Error Details:');
                console.error(JSON.stringify(err, null, 2));
                if (err.code === 'ECONNRESET') {
                    console.error('CAUSE: ECONNRESET - Connection was closed by the server (Check TLS versions/Ciphers/Firewall)');
                }
                return resolve(null);
            }

            console.log(`Step 2: Auth Result: ${auth}`);

            if (auth) {
                console.log(`Step 3: Fetching user details for '${username}'`);
                ad.findUser(username, function (err, user) {
                    if (err) {
                        console.error('❌ LDAP Find Error:', err);
                        return resolve(null);
                    }
                    if (!user) {
                        console.warn(`⚠️ User '${username}' authenticated but not found in directory search.`);
                        return resolve(null);
                    }

                    console.log('✅ LDAP Authentication Successful');
                    resolve(user);
                });
            } else {
                console.warn('⚠️ LDAP Authentication failed (auth=false)');
                resolve(null);
            }
        });
    });
}

/**
 * Test LDAP Connection with provided config (for the test button)
 */
async function testLdapConnection(testConfig, username, password) {
    const isTrue = (val) => val === 'true' || val === true || val === '1' || val === 1;

    // Normalize logic
    let url = testConfig.ldap_url;
    const isSSL = isTrue(testConfig.ldap_ssl);

    if (url) {
        if (isSSL && url.startsWith('ldap://')) {
            url = url.replace('ldap://', 'ldaps://');
        } else if (!url.startsWith('ldap://') && !url.startsWith('ldaps://')) {
            url = isSSL ? `ldaps://${url}` : `ldap://${url}`;
        }
    }

    if (testConfig.ldap_port && !url.split('://')[1].includes(':')) {
        url = `${url}:${testConfig.ldap_port}`;
    }

    const adConfig = {
        url: url,
        baseDN: testConfig.ldap_searchBase,
        username: testConfig.ldap_bindDN,
        password: testConfig.ldap_bindCredentials,
        tlsOptions: isSSL ? {
            rejectUnauthorized: isTrue(testConfig.ldap_verify_cert),
            minVersion: 'TLSv1'
        } : undefined,
        connectTimeout: 10000, // 10s for testing
        socketTimeout: 10000
    };

    console.log('\n--- LDAP TEST CONNECTION START ---');
    console.log(`URL: ${adConfig.url}`);
    console.log(`Bind DN: ${adConfig.username}`);
    console.log(`TLS: ${JSON.stringify(adConfig.tlsOptions)}`);

    return new Promise((resolve, reject) => {
        const ad = new ActiveDirectory(adConfig);

        console.log('Step 1: Testing Service Bind (findUser with BindDN)...');
        ad.findUser(adConfig.username, function (err, result) {
            if (err) {
                console.error('❌ LDAP Service Bind Failed:', JSON.stringify(err, null, 2));
                if (err.lde_message && err.lde_message.includes('52e')) {
                    return reject(new Error('SERVICE BIND FAILED: Die Zugangsdaten für den "Bind DN" (Service User) sind falsch.'));
                }
                return reject(err);
            }

            console.log('✅ Service Bind Successful. Step 2: Testing User Authentication...');

            let bindUser = username;
            if (testConfig.ldap_upnSuffix && !bindUser.includes('@')) {
                bindUser = bindUser + testConfig.ldap_upnSuffix;
            }

            console.log(`Attempting auth for: ${bindUser}`);

            ad.authenticate(bindUser, password, function (err, auth) {
                if (err) {
                    console.error('❌ LDAP User Auth Failed:', JSON.stringify(err, null, 2));
                    if (err.lde_message && err.lde_message.includes('52e')) {
                        return reject(new Error('USER AUTH FAILED: Login für den Test-Benutzer fehlgeschlagen. Versuchen Sie "user@domain" oder "DOMAIN\\user".'));
                    }
                    return reject(err);
                }

                if (auth) {
                    console.log('✅ User Auth Successful. Step 3: Verifying User Object...');
                    ad.findUser(username, function (err, user) {
                        if (err) {
                            console.error('❌ LDAP Final Search Failed:', err);
                            return reject(err);
                        }
                        if (!user) return reject(new Error('User authenticated but object is null'));
                        console.log('✅ Test Complete: Success');
                        resolve(user);
                    });
                } else {
                    console.warn('⚠️ Authentication failed (Invalid Credentials)');
                    reject(new Error('Authentication failed (Invalid Credentials for Test User)'));
                }
            });
        });
    });
}

module.exports = { authenticateLDAP, testLdapConnection };
