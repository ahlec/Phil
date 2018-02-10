module.exports = (function() {
    'use strict';

    const helpGroups = require('../phil/help-groups');
    const suggesting = require('../phil/suggesting');

    return {
        aliases: [],

        helpGroup: helpGroups.Groups.Prompts,
        helpDescription: 'Suggests a new daily prompt for Phil to add to his list. (*DIRECT MESSAGE ONLY*)',
        versionAdded: 1,

        privateRequiresAdmin: false,
        processPrivateMessage: function(bot, message, commandArgs, db) {
            return suggesting.suggestCommand(bot, message, commandArgs, db, 'suggest', false);
        }
    };
})();
