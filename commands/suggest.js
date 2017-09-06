module.exports = (function() {
    'use strict';

    const botUtils = require('../bot_utils.js');

    return {
        requiresAdmin: false,
        aliases: [],
        processPrivateMessage: function(bot, user, userId, channelId, commandArgs, db) {
            bot.sendMessage({
                to: channelId,
                message: 'Under construction!'
            });
        }
    };
})();