'use strict';

const versions = require('../phil/versions');
const helpGroups = require('../phil/help-groups');
const discord = require('../promises/discord');

function composeMessage() {
    return '**Code:** Version ' + versions.CODE + '.\n**Database:** Version ' + versions.DATABASE + '.';
}

module.exports = {
    aliases: [ 'versions' ],

    helpGroup: helpGroups.Groups.General,
    helpDescription: 'Prints out the current version numbers related to Phil.',
    versionAdded: 3,

    publicRequiresAdmin: false,
    processPublicMessage: function(bot, message, commandArgs, db) {
        return Promise.resolve()
            .then(composeMessage)
            .then(reply => discord.sendMessage(bot, message.channelId, reply));
    }
};
