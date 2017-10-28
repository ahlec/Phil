module.exports = (function() {
    'use strict';

    const botUtils = require('../bot_utils');
    const helpGroups = require('../phil/help-groups');
    const conchReplies = [
        'Maybe someday',
        'Nothing',
        'Neither',
        'Follow the seahorse',
        'I don\'t think so',
        'No',
        'No',
        'No',
        'Yes',
        'Try asking again',
        'Try asking again'
    ];

    function _createMessage() {
        const reply = botUtils.getRandomArrayEntry(conchReplies);
        return ':shell: The Magic Conch Shell says: **' + reply + '**.'
    }

    function _sendMessage(bot, channelId, message) {
        bot.sendMessage({
            to: channelId,
            message: message
        });
    }

    return {
        publicRequiresAdmin: false,
        privateRequiresAdmin: false,
        aliases: [ 'magicconch', 'mc' ],
        helpGroup: helpGroups.Groups.Memes,
        helpDescription: 'The Magic Conch Says...',

        processPublicMessage: function(bot, user, userId, channelId, commandArgs, db) {
            return Promise.resolve()
                .then(() => _createMessage())
                .then(message => _sendMessage(bot, channelId, message));
        }
    };
})();