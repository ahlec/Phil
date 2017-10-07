module.exports = (function() {
    'use strict';

	const versions = require('../phil/versions');

    return {
        publicRequiresAdmin: false,
        privateRequiresAdmin: false,
        aliases: [ 'versions' ],
        hideFromHelpListing: true,
        helpDescription: 'Prints out the current version numbers related to Phil.',
        processPublicMessage: function(bot, user, userId, channelId, commandArgs, db) {
            bot.sendMessage({
                to: channelId,
                message: '**Code:** Version ' + versions.CODE + '.\n**Database:** Version ' + versions.DATABASE + '.'
            });
        }
    };
})();