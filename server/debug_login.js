const jwt = require('jsonwebtoken');
const { GlobalSettings, User } = require('./src/models');
const sequelize = require('./src/config/database');

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InMuZmxlaXNjaGVyIiwiZW1haWwiOiJzLmZsZWlzY2hlckBtc28taGVmLmRlIiwiZ3JvdXBzIjpbIkNOPW1zb19rX21zMzY1LE9VPUFsbGdlbWVpbixPVT1LbGFzc2VuLE9VPVNpY2hlcmhlaXRzZ3J1cHBlbixPVT1NU08sREM9bXNvLERDPWxvY2FsIiwiQ049bXNvX3NhX2FsbGdlbWVpbixPVT1BbGxnZW1laW4sT1U9S2xhc3NlbixPVT1TaWNoZXJoZWl0c2dydXBwZW4sT1U9TVNPLERDPW1zbyxEQz1sb2NhbCIsIkNOPW1zb19zYV9zdGFtbWxlaHJlcixPVT1TdGFtbWxlaHJlcixPVT1LbGFzc2VuLE9VPVNpY2hlcmhlaXRzZ3J1cHBlbixPVT1NU08sREM9bXNvLERDPWxvY2FsIiwiQ049bXNvX3NhX2JlcnVmbGljaCxPVT1CZXJ1ZmxpY2gsT1U9S2xhc3NlbixPVT1TaWNoZXJoZWl0c2dydXBwZW4sT1U9TVNPLERDPW1zbyxEQz1sb2NhbCIsIkNOPW1zb19zYV9neW1uYXNpYWwsT1U9R3ltbmFzaWFsLE9VPUtsYXNzZW4sT1U9U2ljaGVyaGVpdHNncnVwcGVuLE9VPU1TTyxEQz1tc28sREM9bG9jYWwiLCJDTj1tc29fbGVocmVyLE9VPVNpY2hlcmhlaXRzZ3J1cHBlbixPVT1NU08sREM9bXNvLERDPWxvY2FsIl0sInJvbGUiOiJhZG1pbiIsImlzX2xkYXAiOnRydWUsImlhdCI6MTc4MzkzODg5MCwiZXhwIjoxNzgzOTM4OTUwfQ.Mbc0fJnX0nN8nHH5xCXbUG6jrW2UOBUhFaiUY6HSEwE";

async function run() {
    try {
        await sequelize.sync();
        const ssoEnabledSetting = await GlobalSettings.findByPk('sso_enabled');
        const ssoSecretSetting = await GlobalSettings.findByPk('sso_jwt_secret');
        const groupFilterSetting = await GlobalSettings.findByPk('ldap_groupFilter');

        const ssoEnabled = ssoEnabledSetting ? ssoEnabledSetting.value : 'not set';
        const secret = ssoSecretSetting ? ssoSecretSetting.value : null;
        const filter = groupFilterSetting ? groupFilterSetting.value : null;

        console.log('--- SSO DIAGNOSTICS ---');
        console.log('SSO Enabled:', ssoEnabled);
        console.log('SSO Secret present:', !!secret);
        console.log('SSO Group Filter:', filter);

        if (!secret) {
            console.log('❌ Kein Secret konfiguriert.');
            return;
        }

        let decoded;
        try {
            decoded = jwt.verify(token, secret, { clockTolerance: 300 });
            console.log('✅ JWT erfolgreich verifiziert.');
        } catch (err) {
            console.log('❌ JWT Verifizierung fehlgeschlagen:', err.message);
            return;
        }

        const username = decoded.username || decoded.sub;
        console.log('Username from token:', username);

        const userGroups = decoded.groups || [];
        console.log('Groups from token:', userGroups);

        const matchesGroupFilter = (groupsList, filter) => {
            if (!filter || filter.trim() === '') return true; 
            if (!groupsList || !Array.isArray(groupsList)) return false;

            let targetDN = filter;
            const memberOfMatch = filter.match(/memberOf=([^)]+)/i);
            if (memberOfMatch) {
                targetDN = memberOfMatch[1];
            }
            targetDN = targetDN.replace(/[()]/g, '').trim().toLowerCase();
            console.log('Processed target DN for matching:', targetDN);

            return groupsList.some(g => {
                const groupStr = g.toLowerCase();
                const matched = groupStr === targetDN || 
                                (targetDN.startsWith('cn=') && groupStr.includes(targetDN)) ||
                                (groupStr.includes(`cn=${targetDN}`) || groupStr === targetDN);
                if (matched) {
                    console.log(`  -> Match found for group: "${g}"`);
                }
                return matched;
            });
        };

        const isAllowed = matchesGroupFilter(userGroups, filter);
        console.log('Is user allowed by group filter?', isAllowed);

    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}

run();
