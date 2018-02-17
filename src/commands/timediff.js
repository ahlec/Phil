'use strict';

const features = require('../phil/features');
const helpGroups = require('../phil/help-groups');
const timezones = require('../phil/timezones');
const moment = require('moment-timezone');
const discord = require('../promises/discord');

function ensureMentionedUserProvidedTimezone(timezoneName) {
    if (!timezoneName || timezoneName.length === 0) {
        return Promise.reject('The user you mentioned has not provided their timezone yet. They can do so by using `' + process.env.COMMAND_PREFIX + 'timezone`, but if they\'re unwilling to do so, you can always just ask them privately!');
    }

    return timezoneName;
}

function getHoursApart(yourTimezone, theirTimezone) {
    const now = moment.utc();
    const yourOffset = moment.tz.zone(yourTimezone).offset(now);
    const theirOffset = moment.tz.zone(theirTimezone).offset(now);
    return (yourOffset - theirOffset) / 60;
}

function composeReply(hoursApart, otherUser) {
    if (hoursApart === 0) {
        return 'The two of you are in the same timezone.';
    }

    const hourNoun = ((hoursApart === 1 || hoursApart === -1) ? 'hour' : 'hours');

    if (hoursApart < 0) {
        return otherUser + ' is **' + Math.abs(hoursApart) + ' ' + hourNoun + '** behind you right now.';
    }

    return otherUser + ' is **' + hoursApart + ' ' + hourNoun + '** ahead of you right now.';
}

module.exports = {
    aliases: [],

    helpGroup: helpGroups.Groups.Time,
    helpDescription: 'Tells you the time difference (in hours) between you and the user that you mention with this command.',
    versionAdded: 10,

    publicRequiresAdmin: false,
    processPublicMessage: function(bot, message, commandArgs, db) {
        if (message.mentions.length !== 1) {
            return Promise.reject('In order to use this function, you must mention the user you\'re asking about. For instance, something like `' + process.env.COMMAND_PREFIX + 'timediff @Bunnymund#1234`.');
        }

        const mention = message.mentions[0];
        if (mention.userId === message.userId) {
            return discord.sendMessage(bot, message.channelId, ':unamused:');
        }

        return features.ensureFeatureIsEnabled(features.Features.TimezoneProcessing, db)
            .then(() => timezones.getTimezoneForUser(db, message.userId))
            .then(timezones.ensureTimezoneProvided)
            .then(yourTimezoneName => {
                return timezones.getTimezoneForUser(db, mention.userId)
                    .then(ensureMentionedUserProvidedTimezone)
                    .then(theirTimezoneName => getHoursApart(yourTimezoneName, theirTimezoneName))
                    .then(hoursApart => composeReply(hoursApart, mention.user))
                    .then(reply => discord.sendMessage(bot, message.channelId, reply));
            });
    }
};
