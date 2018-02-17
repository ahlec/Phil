'use strict';

const helpGroups = require('../phil/help-groups');
const suggesting = require('../phil/suggesting');

module.exports = {
    aliases: [],

    helpGroup: helpGroups.Groups.Prompts,
    helpDescription: 'Suggests a new prompt to Phil. (*DIRECT MESSAGE ONLY*)',
    versionAdded: 1,

    privateRequiresAdmin: false,
    processPrivateMessage: function(bot, message, commandArgs, db) {
        return suggesting.suggestCommand(bot, message, commandArgs, db, 'suggest', false);
    }
};
