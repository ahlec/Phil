'use strict';

const chronoNode = require('chrono-node');
const discord = require('../promises/discord');

function createInterjection(dateTimes) {
    var interjection = ':alarm_clock: ';

    for (let dateTime of dateTimes) {
        interjection += dateTime.text + ':';
        interjection += '\n';
    }

    interjection = interjection.trim();
    return interjection;
}

module.exports = function(bot, message, db) {
    const dateTimes = chronoNode.parse(message.content);

    if (dateTimes.length === 0) {
        return Promise.resolve();
    }

    return Promise.resolve(dateTimes)
        .then(createInterjection)
        .then(interjection => discord.sendMessage(bot, message.channelId, interjection));
};