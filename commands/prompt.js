module.exports = (function() {
    'use strict';

    const features = require('../phil/features');
    const prompts = require('../phil/prompts');
    const helpGroups = require('../phil/help-groups');

    function _ensureThereIsPromptForToday(prompt) {
        if (prompt === null) {
            return Promise.reject('There\'s no prompt for today. That probably means that I\'m out of them! Why don\'t you suggest more by sending me `' + process.env.COMMAND_PREFIX + 'suggest` and including your prompt?');
        }

        return prompt;
    }

    return {
        aliases: [],

        helpGroup: helpGroups.Groups.Prompts,
        helpDescription: 'Asks Phil to remind you what the prompt of the day is.',
        versionAdded: 3,

        publicRequiresAdmin: false,
        processPublicMessage: function(bot, message, commandArgs, db) {
            return features.ensureFeatureIsEnabled(features.Features.DailyPrompts, db)
                .then(() => prompts.getTodaysPrompt(bot, db, message.server))
                .then(_ensureThereIsPromptForToday)
                .then(prompt => prompts.sendPromptToChannel(bot, message.channelId, prompt.promptNumber, prompt));
        }
    };
})();
