module.exports = (function() {
    'use strict';

    const botUtils = require('../phil/utils');
    const prompts = require('../phil/prompts');
    const helpGroups = require('../phil/help-groups');

    function rejectPrompt(db, promptId) {
        return db.query('DELETE FROM hijack_prompts WHERE prompt_id = $1', [promptId]);
    }

    function sendCompletionMessage(bot, channelId, numRejected) {
        if (numRejected === 0) {
            botUtils.sendErrorMessage({
                bot: bot,
                channelId: channelId,
                message: 'No prompts were rejected. This is probably because they were already rejected. You can start over by using `' + process.env.COMMAND_PREFIX + 'unconfirmed` to see all of the still-unconfirmed prompts.'
            });
            return;
        }

        botUtils.sendSuccessMessage({
            bot: bot,
            channelId: channelId,
            message: (numRejected === 1 ? 'Prompt was' : 'Prompts were') + ' rejected. You may continue using `' + process.env.COMMAND_PREFIX + 'reject` or start over by using `' + process.env.COMMAND_PREFIX + 'unconfirmed`.'
        });
    }

    return {
        aliases: [],

        helpGroup: helpGroups.Groups.None,
        versionAdded: 1,

        publicRequiresAdmin: true,
        processPublicMessage: function(bot, message, commandArgs, db) {
            return prompts.getConfirmRejectNumbersFromCommandArgs(commandArgs)
                .then(numbers => prompts.confirmRejectNumbers(db, message.channelId, numbers, rejectPrompt))
                .then(numRejected => sendCompletionMessage(bot, message.channelId, numRejected));
        }
    };
})();
