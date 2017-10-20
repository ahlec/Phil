module.exports = (function() {
    'use strict';

    const botUtils = require('../bot_utils');
    const prompts = require('../phil/prompts');

    // --------------------------------- Private message functionality

    function confirmPreviousSuggestion(db, userId) {
        return db.query('UPDATE hijack_prompts SET approved_by_user = E\'1\' WHERE approved_by_user = E\'0\' AND suggesting_userid = $1', [userId]);
    }

    function reportSuggestionConfirmationResult(result, bot, channelId) {
        if (result.rowCount >= 1) {
            botUtils.sendSuccessMessage({
                bot: bot,
                channelId: channelId,
                message: 'Your prompt suggestion has been confirmed! An admin will now look at it and, if it\'s approved, it will rotate into the daily pool shortly. Thank you!\nIn the meanwhile, feel free to continue suggesting more prompts as well! The more the merrier!'
            });
        } else {
            botUtils.sendErrorMessage({
                bot: bot,
                channelId: channelId,
                message: 'You didn\'t have any prompt suggestions waiting to be confirmed! Please suggest a new prompt via `' + process.env.COMMAND_PREFIX + 'suggest` first.'
            });
        }
    }
    
    // --------------------------------- Public message functionality

    function confirmPrompt(db, promptId) {
        return db.query('UPDATE hijack_prompts SET approved_by_admin = E\'1\' WHERE prompt_id = $1', [promptId]);
    }

    function sendCompletionMessage(bot, channelId, numConfirmed) {
        if (numConfirmed === 0) {
            botUtils.sendErrorMessage({
                bot: bot,
                channelId: channelId,
                message: 'No prompts were confirmed. This is probably because they were already confirmed. You can start over by using `' + process.env.COMMAND_PREFIX + 'unconfirmed` to see all of the still-unconfirmed prompts.'
            });
            return;
        }

        botUtils.sendSuccessMessage({
            bot: bot,
            channelId: channelId,
            message: (numConfirmed === 1 ? 'Prompt was' : 'Prompts were') + ' confirmed. You may continue using `' + process.env.COMMAND_PREFIX + 'confirm` or start over by using `' + process.env.COMMAND_PREFIX + 'unconfirmed`.'
        });
    }

    return {
        publicRequiresAdmin: true,
        privateRequiresAdmin: false,
        aliases: [],
        hideFromHelpListing: true,

        processPublicMessage: function(bot, user, userId, channelId, commandArgs, db) {
            return prompts.getConfirmRejectNumbersFromCommandArgs(commandArgs)
                .then(numbers => prompts.confirmRejectNumbers(db, channelId, numbers, confirmPrompt))
                .then(numConfirmed => sendCompletionMessage(bot, channelId, numConfirmed));
        },

        processPrivateMessage: function(bot, user, userId, channelId, commandArgs, db) {
            return confirmPreviousSuggestion(db, userId)
                .then(result => reportSuggestionConfirmationResult(result, bot, channelId));
        }
    };
})();