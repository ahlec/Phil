module.exports = (function() {
    'use strict';

    const botUtils = require('../bot_utils');
    const helpGroups = require('../phil/help-groups');

    function _sendMessage(bot, channelId, message) {
        bot.sendMessage({
            to: channelId,
            message: message
        });
    }

    return {
        aliases: [ 'poison' ],

        helpGroup: helpGroups.Groups.Memes,
        helpDescription: 'Oh right, the poison.',

        publicRequiresAdmin: false,
        processPublicMessage: function(bot, message, commandArgs, db) {
            const apology = botUtils.getRandomArrayEntry(apologies);
            return Promise.resolve()
                .then(() => _sendMessage(bot, message.channelId, apology));
        }
    };
})();