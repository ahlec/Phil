'use strict';

const botUtils = require('../phil/utils');
const discord = require('../promises/discord');

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

function getDataFromUserIds(bot, serverId, userIds) {
    const server = bot.servers[serverId];

    var names = [];
    for (let index = 0; index < userIds.length; ++index) {
        const userId = userIds[index];
        const member = server.members[userId];
        if (!member) {
            continue;
        }

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

function sendBirthdayWish(bot, serverId, birthdayWish) {
    if (birthdayWish === '') {
        return;
    }

    return discord.sendMessage(bot, process.env.NEWS_CHANNEL_ID, birthdayWish);
}

module.exports = {
    canProcess: function(bot, db, serverId, now) {
        return true;
    },

    process: function(bot, db, serverId, now) {
        return getBirthdayUserIds(db, now)
            .then(userIds => getDataFromUserIds(bot, serverId, userIds))
            .then(data => createBirthdayWish(data))
            .then(birthdayWish => sendBirthdayWish(bot, serverId, birthdayWish));
    }
};
