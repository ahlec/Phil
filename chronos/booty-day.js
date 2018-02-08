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
        return true;
    }

    return (now.getUTCMonth() != dateLastReminded.getUTCMonth());
}

function ensureDatabaseUpdated(results) {
    if (results.rowCount !== 1) {
        return Promise.reject(
            'No database rows were updated when attempting to record that booty day was reported today.');
    }
}

module.exports = {
    canProcess: function(bot, db, serverId, now) {
        if (now.getUTCDate() !== 3) {
            return false;
        }

        return db.query('SELECT value FROM info WHERE key = $1', [DATABASE_INFO_KEY])
            .then(results => interpretLastRemindedResults(results, now));
    },

    process: function(bot, db, serverId, now) {
        return db.query('UPDATE info SET value = $1 WHERE key = $2', [now, DATABASE_INFO_KEY])
            .then(ensureDatabaseUpdated)
            .then(() => discord.sendMessage(bot, process.env.NEWS_CHANNEL_ID, process.env.CUSTOM_EMOJI_PEEK + ' It\'s booty day! Post your Hijack booties!'));
    }
};
