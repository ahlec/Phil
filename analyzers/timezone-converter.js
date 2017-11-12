'use strict';

const chronoNode = require('chrono-node');
const discord = require('../promises/discord');
const timezones = require('../phil/timezones');
const moment = require('moment-timezone');
const features = require('../phil/features');

function createInterjection(dateTimes, timezoneName) {
    var interjection = '';

    for (let dateTime of dateTimes) {
        if (interjection.length > 0) {
            interjection += '\n\n';
        }

        interjection += '**' + dateTime.text + '**\n';

        const usersTime = moment.tz(dateTime.start.date(), timezoneName);
        const utcTime = usersTime.tz('Etc/UTC');
        interjection += utcTime.format('HH:mm (A) on D MMMM YYYY');

        interjection += ' UTC';
    }

    return interjection;
}

function handleTimesEncountered(bot, message, dateTimes, timezoneName, db) {
    if (!timezoneName || timezoneName.length === 0) {
        return timezones.startQuestionnaire(bot, db, message.userId, false);
    }

    const interjection = createInterjection(dateTimes, timezoneName);
    return discord.sendEmbedMessage(bot, message.channelId, {
        color: 0x7A378B,
        title: 'Timezone Conversion',
        description: interjection,
        footer: {
            text: 'All times converted from user\'s local timezone to UTC'
        }
    });
}

function branchDeclinedProvidingTimezone(bot, db, message, dateTimes, declinedProviding) {
    if (declinedProviding) {
        return;
    }

    return timezones.getTimezoneForUser(db, message.userId)
        .then(timezoneName => handleTimesEncountered(bot, message, dateTimes, timezoneName, db));
}

function branchDoingQuestionnaire(bot, db, message, dateTimes, isDoingQuestionnaire) {
    if (isDoingQuestionnaire) {
        return;
    }

    return timezones.hasDeclinedProvidingTimezone(db, message.userId)
        .then(declinedProviding => branchDeclinedProvidingTimezone(bot, db, message, dateTimes, declinedProviding));
}

function branchFeatureEnabled(bot, db, message, dateTimes, isFeatureEnabled) {
    if (!isFeatureEnabled) {
        return;
    }

    return timezones.isCurrentlyDoingQuestionnaire(db, message.userId)
        .then(isDoingQuestionnaire => branchDoingQuestionnaire(bot, db, message, dateTimes, isDoingQuestionnaire));
}

module.exports = function(bot, message, db) {
    const dateTimes = chronoNode.parse(message.content);

    if (dateTimes.length === 0) {
        return Promise.resolve();
    }

    return features.getIsFeatureEnabled(features.Features.TimezoneProcessing, db)
        .then(isEnabled => branchFeatureEnabled(bot, db, message, dateTimes, isEnabled));
};
