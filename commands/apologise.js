module.exports = (function() {
    'use strict';

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

    return {
        publicRequiresAdmin: false,
        privateRequiresAdmin: false,
        aliases: [ 'apologize' ],
        hideFromHelpListing: true,
        helpDescription: 'Makes Phil apologise for making a mistake.',
        processPublicMessage: function(bot, user, userId, channelId, commandArgs, db) {
            const randomIndex = Math.floor(Math.random() * apologies.length);
            const apology = apologies[randomIndex];

            bot.sendMessage({
                to: channelId,
                message: apology
            });
        }
    };
})();