module.exports = (function() {
    'use strict';

    const botUtils = require('../bot_utils');
    const helpGroups = require('../phil/help-groups');

    const apologies = [
        'I am incredibly sorry for my mistake.',
        'Es tut mir aber leid, dass ich ein schlechte Yeti war.',
        'We all make mistakes, and I made a horrible one. I\'m sincerely sorry.',
        'I apologise for my behaviour, it was unacceptable and I will never do it again.',
        'I\'m sorry.',
        'I\'m really sorry.',
        'I hope you can forgive me for what I\'ve done.',
        'I will do my best to learn from this mistake that I\'ve made.',
        'On my Yeti honour and pride, I shall never do this again.'
    ];

    function _sendMessage(bot, channelId, apology) {
        bot.sendMessage({
            to: channelId,
            message: apology
        });
    }

    return {
        aliases: [ 'apologize' ],

        helpGroup: helpGroups.Groups.None,
        helpDescription: 'Makes Phil apologise for making a mistake.',
        versionAdded: 3,
        
        publicRequiresAdmin: false,
        processPublicMessage: function(bot, message, commandArgs, db) {
            const apology = botUtils.getRandomArrayEntry(apologies);
            return Promise.resolve()
                .then(() => _sendMessage(bot, message.channelId, apology));
        }
    };
})();