module.exports = (function() {
    'use strict';

    const botUtils = require('../bot_utils');
    const chronoNode = require('chrono-node');
    const helpGroups = require('../phil/help-groups');

    const months = [
        {
            fullName: 'January',
            abbreviation: 'Jan',
            emoji: ':snowman2:'
        },
        {
            fullName: 'February',
            abbreviation: 'Feb',
            emoji: ':revolving_hearts:'
        },
        {
            fullName: 'March',
            abbreviation: 'Mar',
            emoji: ':four_leaf_clover:'
        },
        {
            fullName: 'April',
            abbreviation: 'Apr',
            emoji: ':cloud_rain:'
        },
        {
            fullName: 'May',
            abbreviation: 'May',
            emoji: ':rose:'
        },
        {
            fullName: 'June',
            abbreviation: 'June',
            emoji: ':beach:'
        },
        {
            fullName: 'July',
            abbreviation: 'July',
            emoji: ':sunrise:'
        },
        {
            fullName: 'August',
            abbreviation: 'Aug',
            emoji: ':sun_with_face:'
        },
        {
            fullName: 'September',
            abbreviation: 'Sept',
            emoji: ':fallen_leaf:'
        },
        {
            fullName: 'October',
            abbreviation: 'Oct',
            emoji: ':jack_o_lantern:'
        },
        {
            fullName: 'November',
            abbreviation: 'Nov',
            emoji: ':turkey:'
        },
        {
            fullName: 'December',
            abbreviation: 'Dec',
            emoji: ':snowflake:'
        }
    ];

    function determineMonth(commandArgs) {
        const input = commandArgs.join(' ').trim();
        if (input === '') {
            const now = new Date();
            return now.getUTCMonth() + 1;
        }

        const inputDate = chronoNode.parseDate(input);
        if (inputDate === null) {
            return Promise.reject('I couldn\'t understand what month you were trying to get the calendar for. Please try requesting `' + process.env.COMMAND_PREFIX + 'calendar` or `' + process.env.COMMAND_PREFIX + 'calendar december` to target a month that isn\'t this month.');
        }

        return inputDate.getUTCMonth() + 1;
    }

    function createCalendarDataStructureForMonth(month) {
        const calendar = {
            month: month,
            monthInfo: months[month - 1],
            days: [] // array of arrays, always 31 entries long, index into here = zero-based day of month
        };

        for (let day = 0; day < 31; ++day) {
            calendar.days.push([]);
        }

        return calendar;
    }

    function addEntryToCalendar(calendar, day, message) {
        calendar.days[day - 1].push(message);
    }

    function handleBirthdayDbError(err) {
        return Promise.reject('There was a database error when attempting to get the birthdays for this month. `' + err + '`');
    }

    function addBirthdaysDbResults(calendar, results, bot) {
        for (let index = 0; index < results.rowCount; ++index) {
            const userId = results.rows[index].userid;
            const user = bot.users[userId];
            if (user === undefined) {
                continue;
            }

            const day = results.rows[index].birthday_day;
            const message = '**' + user.username + '**\'s birthday.';
            addEntryToCalendar(calendar, day, message);
        }

        return calendar;
    }

    function addBirthdaysForMonth(calendar, db, bot) {
        return db.query('SELECT userid, birthday_day FROM birthdays WHERE birthday_month = $1', [calendar.month])
            .catch(handleBirthdayDbError)
            .then(results => addBirthdaysDbResults(calendar, results, bot));
    }

    function addServerEventsForMonth(calendar) {
        addEntryToCalendar(calendar, 3, 'Hijack Booty Day.');
        return calendar;
    }

    function addDatesToCalendar(calendar, db, bot) {
        return addBirthdaysForMonth(calendar, db, bot)
            .then(addServerEventsForMonth);
    }

    function composeMessageFromCalendar(calendar, bot, channelId) {
        const serverId = bot.channels[channelId].guild_id;
        const server = bot.servers[serverId];

        var message = calendar.monthInfo.emoji + ' **' + calendar.monthInfo.fullName + '** calendar for the ' + server.name + ' Server\n\n';

        for (let index = 0; index < calendar.days.length; ++index) {
            const dayPrefix = (index + 1) + ' ' + calendar.monthInfo.abbreviation + ': ';
            for (let dayMessage of calendar.days[index]) {
                message += dayPrefix;
                message += dayMessage;
                message += '\n';
            }
        }

        return message;
    }

    function sendCalendarMessage(message, bot, channelId) {
        bot.sendMessage({
            to: channelId,
            message: message
        });
    }

    return {
        aliases: [],

        helpGroup: helpGroups.Groups.General,
        helpDescription: 'Has Phil display the calendar of server events for the month in question.',
        
        publicRequiresAdmin: false,
        processPublicMessage: function(bot, message, commandArgs, db) {
            return Promise.resolve()
                .then(() => determineMonth(commandArgs))
                .then(createCalendarDataStructureForMonth)
                .then(calendar => addDatesToCalendar(calendar, db, bot))
                .then(calendar => composeMessageFromCalendar(calendar, bot, message.channelId))
                .then(calendarMessage => sendCalendarMessage(calendarMessage, bot, message.channelId));
        }
    };
})();