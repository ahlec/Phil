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

module.exports = function(bot, message, db) {
    const dateTimes = chronoNode.parse(message.content);

    if (dateTimes.length === 0) {
        return Promise.resolve();
    }

    console.log(message.channelId);

    return timezones.getTimezoneForUser(db, message.userId)
        .then(timezoneName => handleTimesEncountered(bot, message, dateTimes, timezoneName, db));
};