/**
 * User Merge Service
 *
 * Sorgt dafür, dass Benutzer, die sich abwechselnd über LDAP und SSO (JWT) anmelden,
 * immer im selben Benutzerkonto landen. Identifikationsmerkmal ist die E-Mail-Adresse
 * (case-insensitive, ohne führende/folgende Leerzeichen), da LDAP und SSO aus demselben
 * Datenstamm gespeist werden.
 *
 * - resolveExternalUser(): Findet beim Login das passende Konto (E-Mail vor Benutzername)
 *   und führt dabei eventuell noch vorhandene Duplikate automatisch zusammen.
 * - findDuplicateGroups(): Liefert alle Gruppen doppelter externer Konten (gleiche E-Mail).
 * - mergeAllDuplicates(): Führt alle gefundenen Duplikat-Gruppen zusammen (Admin-Funktion).
 * - mergeUsers(): Führt eine Liste von Konten in ein primäres Konto zusammen.
 */
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const { sequelize, User, Topic, Availability, Booking, TimeOff, Department } = require('../models');

const EXTERNAL_METHODS = ['ldap', 'sso'];

const normalizeEmail = (email) => (email || '').toString().trim().toLowerCase();

const emailWhere = (email) =>
    sequelize.where(sequelize.fn('lower', sequelize.fn('trim', sequelize.col('email'))), normalizeEmail(email));

const usernameWhere = (username) =>
    sequelize.where(sequelize.fn('lower', sequelize.col('username')), (username || '').toString().trim().toLowerCase());

/**
 * Berechnet, wie viele "Inhalte" an einem Konto hängen.
 * Das Konto mit den meisten Inhalten wird als primäres Konto behalten.
 */
const getUserWeight = async (user, transaction) => {
    const [bookings, topics, availabilities, timeOffs] = await Promise.all([
        Booking.count({ where: { providerId: user.id }, transaction }),
        Topic.count({ where: { userId: user.id, batchConfigId: null }, transaction }),
        Availability.count({ where: { userId: user.id, batchConfigId: null }, transaction }),
        TimeOff.count({ where: { userId: user.id }, transaction })
    ]);
    return {
        bookings,
        topics,
        availabilities,
        timeOffs,
        total: bookings * 10 + topics * 3 + availabilities * 2 + timeOffs + (user.bookingPageActive ? 5 : 0) + (user.profileImage ? 1 : 0)
    };
};

/**
 * Wählt aus einer Liste von Konten das primäre Konto aus:
 * meiste Inhalte zuerst, bei Gleichstand das älteste Konto (kleinste ID).
 */
const pickPrimary = async (users, transaction) => {
    const weighted = [];
    for (const u of users) {
        weighted.push({ user: u, weight: await getUserWeight(u, transaction) });
    }
    weighted.sort((a, b) => {
        if (b.weight.total !== a.weight.total) return b.weight.total - a.weight.total;
        return a.user.id - b.user.id;
    });
    return { primary: weighted[0].user, weighted };
};

/**
 * Führt alle übergebenen Konten in das primäre Konto zusammen.
 * Alle Termine, Themen, Verfügbarkeiten, Abwesenheiten und Abteilungszuordnungen
 * der sekundären Konten werden übernommen, die sekundären Konten anschließend gelöscht.
 *
 * @param {User} primary
 * @param {User[]} secondaries
 * @param {object} [options]
 * @param {Transaction} [options.transaction]
 */
const mergeUsers = async (primary, secondaries, options = {}) => {
    const run = async (transaction) => {
        for (const secondary of secondaries) {
            if (!secondary || secondary.id === primary.id) continue;

            console.log(`[UserMerge] Merging user ${secondary.id} (${secondary.username}, ${secondary.authMethod}) into ${primary.id} (${primary.username}, ${primary.authMethod})`);

            // 1. Topics
            const secondaryTopics = await Topic.findAll({ where: { userId: secondary.id }, transaction });
            for (const topic of secondaryTopics) {
                let duplicateTopic = null;
                if (topic.batchConfigId) {
                    duplicateTopic = await Topic.findOne({
                        where: { userId: primary.id, batchConfigId: topic.batchConfigId },
                        transaction
                    });
                }

                if (duplicateTopic) {
                    // Same batch rule exists on both accounts -> keep primary topic, repoint references
                    await Booking.update({ topicId: duplicateTopic.id }, { where: { topicId: topic.id }, transaction });

                    // Repoint availability-topic links (avoid duplicate pairs)
                    await sequelize.query(
                        `DELETE FROM AvailabilityTopics WHERE topicId = :oldId AND availabilityId IN
                            (SELECT availabilityId FROM AvailabilityTopics WHERE topicId = :newId)`,
                        { replacements: { oldId: topic.id, newId: duplicateTopic.id }, transaction }
                    );
                    await sequelize.query(
                        `UPDATE AvailabilityTopics SET topicId = :newId WHERE topicId = :oldId`,
                        { replacements: { oldId: topic.id, newId: duplicateTopic.id }, transaction }
                    );

                    await topic.destroy({ transaction });
                } else {
                    topic.userId = primary.id;
                    await topic.save({ transaction });
                }
            }

            // 2. Availabilities
            const secondaryAvails = await Availability.findAll({ where: { userId: secondary.id }, transaction });
            for (const avail of secondaryAvails) {
                let duplicateAvail = null;
                if (avail.batchConfigId) {
                    duplicateAvail = await Availability.findOne({
                        where: { userId: primary.id, batchConfigId: avail.batchConfigId },
                        transaction
                    });
                }

                if (duplicateAvail) {
                    await sequelize.query(
                        `DELETE FROM AvailabilityTopics WHERE availabilityId = :id`,
                        { replacements: { id: avail.id }, transaction }
                    );
                    await avail.destroy({ transaction });
                } else {
                    avail.userId = primary.id;
                    await avail.save({ transaction });
                }
            }

            // 3. Bookings (as provider)
            await Booking.update({ providerId: primary.id }, { where: { providerId: secondary.id }, transaction });

            // 4. TimeOffs
            await TimeOff.update({ userId: primary.id }, { where: { userId: secondary.id }, transaction });

            // 5. Departments
            const secondaryDepts = await secondary.getDepartments({ transaction });
            if (secondaryDepts.length > 0) {
                await primary.addDepartments(secondaryDepts, { transaction });
            }

            // 6. Profile fields: fill empty primary fields from secondary
            if (!primary.position && secondary.position) primary.position = secondary.position;
            if (!primary.profileImage && secondary.profileImage) primary.profileImage = secondary.profileImage;
            if ((!primary.locationType || primary.locationType === 'none') && secondary.locationType && secondary.locationType !== 'none') {
                primary.locationType = secondary.locationType;
                primary.location = secondary.location;
            }
            if (!primary.email && secondary.email) primary.email = secondary.email;
            if (secondary.bookingPageActive) primary.bookingPageActive = true;
            if (secondary.isAdmin) primary.isAdmin = true;

            // 7. Delete secondary account
            await secondary.setDepartments([], { transaction });
            await secondary.destroy({ transaction });
        }

        await primary.save({ transaction });
        return primary;
    };

    if (options.transaction) {
        return run(options.transaction);
    }
    return sequelize.transaction(run);
};

/**
 * Findet beim LDAP- oder SSO-Login das passende Benutzerkonto.
 *
 * Reihenfolge:
 * 1. Alle externen Konten (LDAP/SSO) mit derselben E-Mail-Adresse
 * 2. Konto mit gleichem Benutzernamen (case-insensitive)
 *
 * Werden dabei mehrere Konten gefunden, werden diese automatisch zusammengeführt.
 *
 * @returns {Promise<User|null>}
 */
const resolveExternalUser = async ({ username, email }) => {
    const candidates = new Map();

    if (normalizeEmail(email)) {
        const byEmail = await User.findAll({
            where: {
                [Op.and]: [
                    emailWhere(email),
                    { authMethod: { [Op.in]: EXTERNAL_METHODS } }
                ]
            }
        });
        byEmail.forEach(u => candidates.set(u.id, u));
    }

    let byUsername = null;
    if (username) {
        byUsername = await User.findOne({ where: usernameWhere(username) });
    }

    if (byUsername) {
        const sameEmailOrEmpty = !byUsername.email || !normalizeEmail(email) || normalizeEmail(byUsername.email) === normalizeEmail(email);
        const isExternal = EXTERNAL_METHODS.includes(byUsername.authMethod);

        if (candidates.size === 0) {
            // No email match -> fall back to the username match (previous behaviour)
            candidates.set(byUsername.id, byUsername);
        } else if (isExternal && sameEmailOrEmpty) {
            candidates.set(byUsername.id, byUsername);
        }
    }

    const list = Array.from(candidates.values());
    if (list.length === 0) return null;
    if (list.length === 1) return list[0];

    // Multiple accounts for the same person -> merge automatically
    return sequelize.transaction(async (transaction) => {
        const { primary } = await pickPrimary(list, transaction);
        const secondaries = list.filter(u => u.id !== primary.id);
        console.log(`[UserMerge] Login for '${username}' / '${email}' found ${list.length} accounts. Auto-merging into ${primary.id}.`);
        await mergeUsers(primary, secondaries, { transaction });
        return primary;
    });
};

/**
 * Liefert alle Gruppen von externen Konten (LDAP/SSO), die dieselbe E-Mail-Adresse teilen.
 */
const findDuplicateGroups = async () => {
    const users = await User.findAll({
        where: {
            authMethod: { [Op.in]: EXTERNAL_METHODS },
            email: { [Op.ne]: null }
        },
        attributes: ['id', 'username', 'displayName', 'email', 'authMethod', 'bookingPageActive', 'profileImage', 'isAdmin', 'createdAt'],
        order: [['id', 'ASC']]
    });

    const byEmail = new Map();
    for (const u of users) {
        const key = normalizeEmail(u.email);
        if (!key) continue;
        if (!byEmail.has(key)) byEmail.set(key, []);
        byEmail.get(key).push(u);
    }

    const groups = [];
    for (const [email, list] of byEmail.entries()) {
        if (list.length < 2) continue;
        const { primary, weighted } = await pickPrimary(list);
        groups.push({
            email,
            primaryId: primary.id,
            users: weighted.map(w => ({
                id: w.user.id,
                username: w.user.username,
                displayName: w.user.displayName,
                email: w.user.email,
                authMethod: w.user.authMethod,
                bookingPageActive: w.user.bookingPageActive,
                isAdmin: w.user.isAdmin,
                createdAt: w.user.createdAt,
                bookings: w.weight.bookings,
                topics: w.weight.topics,
                availabilities: w.weight.availabilities,
                timeOffs: w.weight.timeOffs,
                isPrimary: w.user.id === primary.id
            }))
        });
    }

    groups.sort((a, b) => a.email.localeCompare(b.email));
    return groups;
};

/**
 * Erstellt eine Sicherungskopie der SQLite-Datenbank vor einer Massen-Zusammenführung.
 */
const backupDatabase = () => {
    try {
        const storage = sequelize.options.storage;
        if (!storage || !fs.existsSync(storage)) return null;
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(path.dirname(storage), `database.before-merge-${stamp}.sqlite`);
        fs.copyFileSync(storage, backupPath);
        console.log(`[UserMerge] Database backup created: ${backupPath}`);
        return backupPath;
    } catch (err) {
        console.error('[UserMerge] Database backup failed:', err);
        return null;
    }
};

/**
 * Führt alle Duplikat-Gruppen zusammen.
 */
const mergeAllDuplicates = async () => {
    const groups = await findDuplicateGroups();
    if (groups.length === 0) return { mergedGroups: 0, removedAccounts: 0, backupPath: null };

    const backupPath = backupDatabase();
    let removedAccounts = 0;

    await sequelize.transaction(async (transaction) => {
        for (const group of groups) {
            const ids = group.users.map(u => u.id);
            const users = await User.findAll({ where: { id: { [Op.in]: ids } }, transaction });
            const primary = users.find(u => u.id === group.primaryId);
            const secondaries = users.filter(u => u.id !== group.primaryId);
            await mergeUsers(primary, secondaries, { transaction });
            removedAccounts += secondaries.length;
        }
    });

    return { mergedGroups: groups.length, removedAccounts, backupPath: backupPath ? path.basename(backupPath) : null };
};

module.exports = {
    normalizeEmail,
    resolveExternalUser,
    findDuplicateGroups,
    mergeAllDuplicates,
    mergeUsers
};
