'use strict';

const helpGroups = require('../phil/help-groups');
const suggesting = require('../phil/suggesting');

module.exports = {
    aliases: [],

    helpGroup: helpGroups.Groups.Prompts,
    helpDescription: 'Suggests a new prompt to Phil anonymously. Your name will not be displayed, but you will still receive leaderboard points should it be approved. (*DIRECT MESSAGE ONLY*)',
    versionAdded: 11,

    privateRequiresAdmin: false,
    processPrivateMessage: function(bot, message, commandArgs, db) {
        return suggesting.suggestCommand(bot, message, commandArgs, db, 'anonsuggest', true);
    }
};
