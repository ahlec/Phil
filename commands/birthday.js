module.exports = (function() {
    'use strict';

    const botUtils = require('../bot_utils.js');
    const chronoNode = require('chrono-node');
    const helpGroups = require('../phil/help-groups');

    const util = require('util');

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
        const birthdayInput = commandArgs.join(' ').trim();
        if (birthdayInput.length === 0) {
            return Promise.reject('Please tell me what your birthday is, like `' + process.env.COMMAND_PREFIX + 'birthday 05 December`.');
        }

        const birthday = chronoNode.parseDate(birthdayInput);
        if (!birthday || birthday === null) {
            return Promise.reject('I couldn\'t figure out how to understand `' + birthdayInput + '`. Could you try again?');
        }

        return birthday;
    }

    function processDbInsertResults(results) {
        if (results.rowCount !== 1) {
            return Promise.reject('Unable to update or insert into the database');
        }
    }

    function processDbUpdateResults(results, db, user, userId, day, month) {
        if (results.rowCount >= 1) {
            return;
        }

        return db.query('INSERT INTO birthdays(username, userid, birthday_day, birthday_month) VALUES($1, $2, $3, $4)', [user, userId, day, month])
            .then(processDbInsertResults);
    }

    function makeDbUpdatedData(day, month) {
        return {
            day: day,
            month: monthNames[month - 1]
        };
    }

    function setBirthdayInDatabase(db, user, userId, birthday) {
        const day = birthday.getDate();
        const month = birthday.getMonth() + 1;

        return db.query('UPDATE birthdays SET birthday_day = $1, birthday_month = $2 WHERE userid = $3', [day, month, userId])
            .then(results => processDbUpdateResults(results, db, user, userId, day, month))
            .then(() => makeDbUpdatedData(day, month));
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
        return Promise.resolve()
            .then(() => parseBirthday(commandArgs))
            .then(birthday => setBirthdayInDatabase(db, user, userId, birthday))
            .then(data => sendDatabaseSuccessMessage(bot, channelId, data));
    }

    return {
        publicRequiresAdmin: false,
        privateRequiresAdmin: false,
        aliases: [],
        helpGroup: helpGroups.Groups.General,
        helpDescription: 'Tell Phil when your birthday is so he can share your birthday with the server.',
        processPublicMessage: handleMessage,
        processPrivateMessage: handleMessage
    };
})();