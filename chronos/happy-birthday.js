'use strict';

const botUtils = require('../phil/utils');
const discord = require('../promises/discord');
const DATABASE_INFO_KEY = 'happy-birthday-last-wished';

function interpretGetDateLastWished(results) {
    if (results.rowCount !== 1) {
        return Promise.reject('There are ' + results.rowCount + ' ' + DATABASE_INFO_KEY + ' info database entries.');
    }

    const dateLastWished = new Date(results.rows[0].value);
    if (isNaN(dateLastWished)) {
        return Promise.reject('Unable to parse database value ' + results.rows[0].value + '.');
    }

    return dateLastWished;
}

function getBirthdayUserIds(db, now) {
    const day = now.getUTCDate();
    const month = now.getUTCMonth() + 1;

    return db.query('SELECT userid FROM birthdays WHERE birthday_day = $1 AND birthday_month = $2', [day, month])
        .then(results => {
            var userIds = [];
            for (let index = 0; index < results.rowCount; ++index) {
                userIds.push(results.rows[index].userid);
            }

            return userIds;
        });
}

function getDataFromUserIds(bot, userIds) {
    const serverId = bot.channels[process.env.NEWS_CHANNEL_ID].guild_id;
    const server = bot.servers[serverId];

    var names = [];
    for (let index = 0; index < userIds.length; ++index) {
        const userId = userIds[index];
        const member = server.members[userId];
        names.push(member.nick);
    }

    var pronoun = botUtils.PRONOUNS.THEY;
    if (userIds.length === 1) {
        pronoun = botUtils.getPronounForUser(bot, userIds[0]);
    }

    return {
        names: names,
        pronoun: pronoun
    };
}

function ensureDatabaseUpdated(results) {
    if (results.rowCount !== 1) {
        return Promise.reject('The database was not updated despite the fact that the query succeeded.');
    }
}

function updateDatabase(db, now, data) {
    return db.query('UPDATE info SET value = $1 WHERE key = $2', [now, DATABASE_INFO_KEY])
        .then(ensureDatabaseUpdated)
        .then(() => data);
}

function createBirthdayWish(data) {
    if (data.names.length === 0) {
        return '';
    }

    var message = ':birthday: Today is ';
    var separator = ', ';
    if (data.names.length === 2) {
        message += 'both ';
        separator = '';
    }

    for (let index = 0; index < data.names.length; ++index) {
        if (index > 0) {
            message += separator;

            if (index === data.names.length - 1) {
                message += ' and ';
            } else {
                message += ' ';
            }
        }
        message += '**' + data.names[index] + '**';
    }

    message += '\'s birthday! Wish ';

    const pronounInCase = botUtils.getPronounOfCase(data.pronoun, botUtils.PRONOUN_CASES.HIM).toLowerCase();
    message += pronounInCase;
    message += ' a happy birthday when you see ';
    message += pronounInCase;
    message += '!';

    return message;
}

function sendBirthdayWish(bot, birthdayWish) {
    if (birthdayWish === '') {
        return;
    }

    return discord.sendMessage(bot, process.env.NEWS_CHANNEL_ID, birthdayWish);
}

module.exports = {
    canProcess: function(chronosManager, now, bot, db) {
        return db.query('SELECT value FROM info WHERE key = $1 LIMIT 1', [DATABASE_INFO_KEY])
            .then(interpretGetDateLastWished)
            .then(dateLastWished => ({ ready: !botUtils.isSameDay(now, dateLastWished) }) );
    },

    process: function(chronosManager, now, bot, db) {
        return getBirthdayUserIds(db, now)
            .then(userIds => getDataFromUserIds(bot, userIds))
            .then(data => updateDatabase(db, now, data))
            .then(data => createBirthdayWish(data))
            .then(birthdayWish => sendBirthdayWish(bot, birthdayWish))
            .then(() => true);
    }
};
