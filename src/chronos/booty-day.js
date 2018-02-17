'use strict';

const discord = require('../promises/discord');

module.exports = function(bot, db, serverId, now) {
    if (now.getUTCDate() !== 3) {
        console.log('Today isn\'t booty day.');
        return Promise.resolve();
    }

    return discord.sendMessage(bot, process.env.NEWS_CHANNEL_ID, process.env.CUSTOM_EMOJI_PEEK + ' It\'s booty day! Post your Hijack booties!');
};
