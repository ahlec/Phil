module.exports = (function() {
    'use strict';

    const botUtils = require('../bot_utils');
    const DATABASE_INFO_KEY = 'happy-birthday-last-wished';

    function getDateLastWished(db) {
        return new Promise((resolve, reject) => {
            db.query('SELECT value FROM info WHERE key = $1', [DATABASE_INFO_KEY])
                .then(results => {
                    if (results.rowCount !== 1) {
                        reject('There are ' + results.rowCount + ' ' + DATABASE_INFO_KEY + ' info database entries.');
                        return;
                    }

                    const dateLastWished = new Date(results.rows[0].value);
                    if (isNaN(dateLastWished)) {
                        reject('Unable to parse database value ' + results.rows[0].value + '.');
                        return;
                    }

                    resolve(dateLastWished);
                })
                .catch(err => {
                    reject('There was a database error trying to read the last date wished from the info table. `' + err + '`');
                });
        });
    }

    function isSameDate(dateA, dateB) {
        if (dateA.getUTCFullYear() != dateB.getUTCFullYear()) {
            return false;
        }

        if (dateA.getUTCMonth() != dateB.getUTCMonth()) {
            return false;
        }

        return (dateA.getUTCDate() == dateB.getUTCDate());
    }

    function getBirthdayUserIds(db, now) {
        return new Promise((resolve, reject) => {
            const day = now.getUTCDate();
            const month = now.getUTCMonth() + 1;
            db.query('SELECT userid FROM birthdays WHERE birthday_day = $1 AND birthday_month = $2', [day, month])
                .then(results => {
                    var userIds = [];
                    for (let index = 0; index < results.rowCount; ++index) {
                        userIds.push(results.rows[index].userid);
                    }
                    resolve(userIds);
                })
                .catch(err => {
                    reject('There was a database error trying to retrieve the users whose birthday is today. `' + err + '`');
                });
        });
    }

    function getDataFromUserIds(bot, userIds) {
        const serverId = bot.channels[process.env.NEWS_CHANNEL_ID].guild_id;
        const server = bot.servers[serverId];

        var userNames = [];
        for (let index = 0; index < userIds.length; ++index) {
            const userId = userIds[index];
            const user = bot.users[userId];
            userNames.push(user.username);
        }

        var pronoun = botUtils.PRONOUNS.THEY;
        if (userIds.length === 1) {
            pronoun = botUtils.getPronounForUser(bot, userIds[0]);
        }

        return {
            userNames: userNames,
            pronoun: pronoun
        };
    }

    function updateDatabase(db, now, data) {
        return new Promise((resolve, reject) => {
            const dateLastUpdatedStr = now.toUTCString();
            db.query('UPDATE info SET value = $1 WHERE key = $2', [dateLastUpdatedStr, DATABASE_INFO_KEY])
                .then(results => {
                    if (results.rowCount !== 1) {
                        reject('There are ' + results.rowCount + ' results from updating the ' + DATABASE_INFO_KEY + ' info database entry?');
                        return;
                    }

                    resolve(data);
                })
                .catch(err => {
                    reject('There was a database error updating the last date wished in the info table. `' + err + '`');
                });
        });
    }

    function createBirthdayWish(data) {
        if (data.userNames.length === 0) {
            return '';
        }

        var message = ':birthday: Today is ';
        var separator = ', ';
        if (data.userNames.length === 2) {
            message += 'both ';
            separator = '';
        }

        for (let index = 0; index < data.userNames.length; ++index) {
            if (index > 0) {
                message += separator;

                if (index === data.userNames.length - 1) {
                    message += ' and ';
                } else {
                    message += ' ';
                }
            }
            message += '**' + data.userNames[index] + '**';
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

        bot.sendMessage({
            to: process.env.NEWS_CHANNEL_ID,
            message: birthdayWish
        });
    }

    return {
        name: 'happy birthday',
        hourUtc: 7, // 3am EST, 12am PST

        canProcess: function(chronosManager, now, bot, db) {
            return new Promise((resolve, reject) => {
                getDateLastWished(db)
                    .then(dateLastWished => {
                        const hasAlreadyWishedHappyBirthdayToday = isSameDate(now, dateLastWished);
                        resolve({
                            ready: !hasAlreadyWishedHappyBirthdayToday
                        });
                    })
                    .catch(err => {
                        reject(err);
                    });
            });
        },

        process: function(chronosManager, now, bot, db) {
            return new Promise((resolve, reject) => {
                getBirthdayUserIds(db, now)
                    .then(userIds => {
                        return getDataFromUserIds(bot, userIds);
                    })
                    .then(data => {
                        return updateDatabase(db, now, data);
                    })
                    .then(data => {
                        return createBirthdayWish(data);
                    })
                    .then(birthdayWish => {
                        sendBirthdayWish(bot, birthdayWish);
                        resolve(true);
                    })
                    .catch(err => {
                        reject(err);
                    });
            });
        }
    };
})();