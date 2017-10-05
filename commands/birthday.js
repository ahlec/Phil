module.exports = (function() {
    'use strict';

    const botUtils = require('../bot_utils.js');
    const chronoNode = require('chrono-node');

    const util = require('util');

    const DATABASE_RESULT_INSERTED = 0;
    const DATABASE_RESULT_UPDATED = 1;

    const monthNames = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December'
    ];

    function parseBirthday(commandArgs) {
        return new Promise((resolve, reject) => {
            const birthdayInput = commandArgs.join(' ').trim();
            if (birthdayInput.length === 0) {
                reject('Please tell me what your birthday is, like `' + process.env.COMMAND_PREFIX + 'birthday 05 December`.');
                return;
            }

            const birthday = chronoNode.parseDate(birthdayInput);
            if (birthday === null) {
                reject('I couldn\'t figure out how to understand `' + birthdayInput + '`. Could you try again?');
                return;
            }

            resolve(birthday);
        });
    }

    function setBirthdayInDatabase(db, user, userId, birthday) {
        return new Promise((resolve, reject) => {
            const day = birthday.getDate();
            const month = birthday.getMonth() + 1;

            db.query('UPDATE birthdays SET birthday_day = $1, birthday_month = $2 WHERE userid = $3', [day, month, userId])
                .then(results => {
                    if (results.rowCount === 1) {
                        resolve({
                            day: day,
                            month: monthNames[month - 1],
                            resultCode: DATABASE_RESULT_UPDATED
                        });
                        return;
                    }

                    db.query('INSERT INTO birthdays(username, userid, birthday_day, birthday_month) VALUES($1, $2, $3, $4)', [user, userId, day, month])
                        .then(insertResults => {
                            if (insertResults.rowCount === 1) {
                                resolve({
                                    day: day,
                                    month: monthNames[month - 1],
                                    resultCode: DATABASE_RESULT_INSERTED
                                });
                                return;
                            }

                            reject('Nothing seems to have happened when I tried updating your birthday in the database :(');
                        })
                        .catch(err => {
                            reject('There was an error trying to create a new entry for your birthday in the database. `' + err + '`');
                        });
                })
                .catch(err => {
                    reject('There was an error trying to update your birthday in the database. `' + err + '`');
                });
        });
    }

    function sendDatabaseSuccessMessage(bot, channelId, data) {
        const day = data.day;
        const monthName = data.month;

        const successMessage = 'I\'ve updated your birthday to be ' + day + ' ' + monthName + '! Thank you! If I made a mistake, however, feel free to tell me your birthday again!';

        botUtils.sendSuccessMessage({
            bot: bot,
            channelId: channelId,
            message: successMessage
        });
    }

    function handleMessage(bot, user, userId, channelId, commandArgs, db) {
        parseBirthday(commandArgs)
            .then(birthday => {
                return setBirthdayInDatabase(db, user, userId, birthday);
            })
            .then(data => {
                sendDatabaseSuccessMessage(bot, channelId, data);
            })
            .catch(errMessage => {
                console.error(errMessage);
                botUtils.sendErrorMessage({
                    bot: bot,
                    channelId: channelId,
                    message: errMessage
                });
            });
    }

    return {
        publicRequiresAdmin: false,
        privateRequiresAdmin: false,
        aliases: [],
        helpDescription: 'Tell Phil when your birthday is so he can share your birthday with the server.',
        processPublicMessage: handleMessage,
        processPrivateMessage: handleMessage
    };
})();