module.exports = (function() {
    'use strict';

    const helpGroups = require('../phil/help-groups');
    const discord = require('../promises/discord');

    return {
        aliases: [],

        helpGroup: helpGroups.Groups.General,
        helpDescription: 'Has Phil provide a link to the editable map of the fandom.',
        versionAdded: 8,

        publicRequiresAdmin: false,
        processPublicMessage: function(bot, message, commandArgs, db) {
            return discord.sendMessage(bot, message.channelId, process.env.HIJACK_FANDOM_GOOGLE_MAP_LINK);
        }
    };
})();