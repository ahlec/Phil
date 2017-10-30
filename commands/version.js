module.exports = (function() {
    'use strict';

    const versions = require('../phil/versions');
    const helpGroups = require('../phil/help-groups');

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
        aliases: [ 'versions' ],

        helpGroup: helpGroups.Groups.General,
        helpDescription: 'Prints out the current version numbers related to Phil.',
        versionAdded: 3,

        publicRequiresAdmin: false,
        processPublicMessage: function(bot, message, commandArgs, db) {
            return Promise.resolve()
                .then(_composeMessage)
                .then(reply => _sendMessage(bot, message.channelId, reply));
        }
    };
})();