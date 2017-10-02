module.exports = (function() {
    'use strict';

    const botUtils = require('../bot_utils.js');
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

    return {
        publicRequiresAdmin: false,
        privateRequiresAdmin: false,
        aliases: [ 'magicconch', 'mc' ],
        helpDescription: 'The Magic Conch Says...',
        processPublicMessage: function(bot, user, userId, channelId, commandArgs, db) {
            const reply = botUtils.getRandomArrayEntry(conchReplies);
            bot.sendMessage({
                to: channelId,
                message: ':shell: The Magic Conch Shell says: **' + reply + '**.'
            });
        }
    };
})();