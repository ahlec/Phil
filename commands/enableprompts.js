module.exports = (function() {
    'use strict';

    const botUtils = require('../bot_utils');
    const prompts = require('../phil/prompts');
    const helpGroups = require('../phil/help-groups');

    function _ensurePromptsAreDisabled(arePromptsEnabled) {
        if (arePromptsEnabled !== false) {
            return Promise.reject('Prompt are not currently disabled, so attempting to enable them would do nothing.');
        }
    }

    function _sendPromptsEnabledMessage(bot, channelId) {
        botUtils.sendSuccessMessage({
            bot: bot,
            channelId: channelId,
            message: 'Prompts are no longer disabled. You can disbled again using `' + process.env.COMMAND_PREFIX + 'disableprompts`.'
        });
    }

    return {
        aliases: [],

        helpGroup: helpGroups.Groups.Prompts,
        helpDescription: 'Lets Phil once again post daily prompts in the appropriate channel. Usable to undo `' + process.env.COMMAND_PREFIX + 'disableprompts`.',
        versionAdded: 2,

        publicRequiresAdmin: true,
        processPublicMessage: function(bot, message, commandArgs, db) {
            return prompts.getAreDailyPromptsEnabled(db)
                .then(_ensurePromptsAreDisabled)
                .then(() => prompts.setPromptsEnabled(db, true))
                .then(() => _sendPromptsEnabledMessage(bot, message.channelId));
        }
    };
})();