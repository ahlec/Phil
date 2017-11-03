'use strict';

const chronoNode = require('chrono-node');
const discord = require('../promises/discord');
const timezones = require('../phil/timezones');

function createInterjection(dateTimes, timezoneName) {
    var interjection = ':alarm_clock: ';

    for (let dateTime of dateTimes) {
        interjection += dateTime.text + ':';
        interjection += '\n';
    }

    interjection = interjection.trim();
    return interjection;
}

function handleTimesEncountered(bot, message, dateTimes, timezoneName, db) {
    if (!timezoneName || timezoneName.length === 0) {
        return timezones.startQuestionnaire(bot, db, message.userId, false);
    }

    const interjection = createInterjection(dateTimes, timezoneName);
    return discord.sendMessage(bot, message.channelId, interjection);
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

module.exports = function(bot, message, db) {
    const dateTimes = chronoNode.parse(message.content);

    if (dateTimes.length === 0) {
        return Promise.resolve();
    }

    return timezones.isCurrentlyDoingQuestionnaire(db, message.userId)
        .then(isDoingQuestionnaire => branchDoingQuestionnaire(bot, db, message, dateTimes, isDoingQuestionnaire));
};