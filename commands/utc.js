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

function formatTimeToString(time) {
    return time.format('HH:mm (h:mm A)');
}

function createReply(inputTime, timezoneName) {
    const localTime = inputTime.clone().moment();
    var reply = formatTimeToString(localTime) + ' local time is **';

    const timezoneOffset = moment().tz(timezoneName).utcOffset();
    inputTime.assign('timezoneOffset', timezoneOffset);
    const utcTime = inputTime.moment().tz('Etc/UTC');
    reply += formatTimeToString(utcTime);
    reply += '** UTC.';

    return reply;
}

function sendReply(bot, channelId, reply) {
    return discord.sendEmbedMessage(bot, channelId, {
        color: 0x7A378B,
        title: 'Timezone Conversion',
        description: reply,
        footer: {
            text: 'Converted from user\'s local timezone to UTC. If the time provided is incorrect, your timezone might need to be updated. Use ' + process.env.COMMAND_PREFIX + 'timezone to change/set.'
        }
    });
}

module.exports = {
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
            .then(timezoneName => createReply(inputTime, timezoneName))
            .then(reply => sendReply(bot, message.channelId, reply));
    }
};
