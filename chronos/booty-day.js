'use strict';

const discord = require('../promises/discord');
const DATABASE_INFO_KEY = 'booty-day-last-reminded';

function interpretLastRemindedResults(results, now) {
    if (results.rowCount !== 1) {
        return Promise.reject('There is no database record for `' + DATABASE_INFO_KEY + '`');
    }

    const dateLastReminded = new Date(results.rows[0].value);
    if (isNaN(dateLastReminded)) {
        return Promise.reject('The value for the last booty day reminder was not a number in the database.');
    }

    if (now.getUTCFullYear() != dateLastReminded.getUTCFullYear()) {
        return false;
    }

    return (now.getUTCMonth() == dateLastReminded.getUTCMonth());
}

function hasAlreadyRemindedBootyDayThisMonth(db, now) {
    return db.query('SELECT value FROM info WHERE key = $1', [DATABASE_INFO_KEY])
        .then(results => interpretLastRemindedResults(results, now));
}

function canProcessFromHasRemindedThisMonth(hasReminded) {
    return {
        ready: !hasReminded
    };
}

function ensureDatabaseUpdated(results) {
    if (results.rowCount !== 1) {
        return Promise.reject(
            'No database rows were updated when attempting to record that booty day was reported today.');
    }
}

function markRemindedInDatabase(db, now) {
    return db.query('UPDATE info SET value = $1 WHERE key = $2', [now, DATABASE_INFO_KEY])
        .then(ensureDatabaseUpdated);
}

module.exports = {
    canProcess: function(chronosManager, now, bot, db) {
        if (now.getUTCDate() !== 3) {
            return Promise.resolve({
                ready: false
            });
        }

        return hasAlreadyRemindedBootyDayThisMonth(db, now)
            .then(canProcessFromHasRemindedThisMonth);
    },

    process: function(chronosManager, now, bot, db) {
        return markRemindedInDatabase(db, now)
            .then(() => discord.sendMessage(bot, process.env.NEWS_CHANNEL_ID, process.env.CUSTOM_EMOJI_PEEK + ' It\'s booty day! Post your Hijack booties!'));
    }
};
