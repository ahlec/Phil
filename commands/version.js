module.exports = (function() {
    'use strict';

    return {
        publicRequiresAdmin: false,
        privateRequiresAdmin: false,
        aliases: [ 'versions' ],
        hideFromHelpListing: true,
        helpDescription: 'Prints out the current version numbers related to Phil.',
        processPublicMessage: function(bot, user, userId, channelId, commandArgs, db) {
            bot.sendMessage({
                to: channelId,
                message: '**Code:** Version ' + bot.PHIL_VERSION + '.\n**Database:** Version ' + bot.DATABASE_VERSION + '.'
            });
        }
    };
})();