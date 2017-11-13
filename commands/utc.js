module.exports = (function() {
    'use strict';

    const features = require('../phil/features');
    const helpGroups = require('../phil/help-groups');
    const timezones = require('../phil/timezones');
    const chronoNode = require('chrono-node');
    const moment = require('moment-timezone');
    const discord = require('../promises/discord');

    function getTimeFromCommandArgs(commandArgs) {
        const content = commandArgs.join(' ').trim();
        if (content.length === 0) {
            return null;
        }

        const dateTimes = chronoNode.parse(content);
        if (!dateTimes || dateTimes.length === 0) {
            return null;
        }

        if (!dateTimes[0].start.isCertain('hour')) {
            return null;
        }

        return dateTimes[0].start;
    }

    function convertTimeToUtc(inputTime, timezoneName) {
        const timezoneOffset = moment().tz(timezoneName).utcOffset();
        inputTime.assign('timezoneOffset', timezoneOffset);
        const usersTime = inputTime.moment();
        return moment(usersTime).tz('Etc/UTC');
    }

    function sendReply(bot, channelId, utcTime) {
        return discord.sendEmbedMessage(bot, channelId, {
            color: 0x7A378B,
            title: 'Timezone Conversion',
            description: utcTime.format('HH:mm (A) on D MMMM YYYY'),
            footer: {
                text: 'Converted from user\'s local timezone to UTC. If the time provided is incorrect, your timezone might need to be updated. Use ' + process.env.COMMAND_PREFIX + 'timezone to change/set.'
            }
        });
    }

    return {
        aliases: [ 'gmt' ],

        helpGroup: helpGroups.Groups.Time,
        helpDescription: 'Converts a time from your local timezone to UTC.',
        versionAdded: 10,

        publicRequiresAdmin: false,
        processPublicMessage: function(bot, message, commandArgs, db) {
            const inputTime = getTimeFromCommandArgs(commandArgs);

            if (!inputTime) {
                return Promise.reject('You must provide a time to this command so that I know what to convert to UTC. You can try using `' + process.env.COMMAND_PREFIX + 'utc 5pm` or `' + process.env.COMMAND_PREFIX + 'utc tomorrow at 11:30` to try it out.');
            }

            return features.ensureFeatureIsEnabled(features.Features.TimezoneProcessing, db)
                .then(() => timezones.getTimezoneForUser(db, message.userId))
                .then(timezones.ensureTimezoneProvided)
                .then(timezoneName => convertTimeToUtc(inputTime, timezoneName))
                .then(utcTime => sendReply(bot, message.channelId, utcTime));
        }
    };
})();
