module.exports = (function() {
    'use strict';

    const versions = require('../phil/versions');

    function _composeMessage() {
        return '**Code:** Version ' + versions.CODE + '.\n**Database:** Version ' + versions.DATABASE + '.';
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
        aliases: [ 'versions' ],
        hideFromHelpListing: true,
        helpDescription: 'Prints out the current version numbers related to Phil.',

        processPublicMessage: function(bot, user, userId, channelId, commandArgs, db) {
            return Promise.resolve()
                .then(_composeMessage)
                .then(message => _sendMessage(bot, channelId, message));
        }
    };
})();