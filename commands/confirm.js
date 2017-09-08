module.exports = (function() {
    'use strict';

    const botUtils = require('../bot_utils.js');

    function confirmPreviouslyUnconfirmedPrompt(db, userId) {
        return db.query('UPDATE hijack_prompts SET approved_by_user = E\'1\' WHERE approved_by_user = E\'0\' AND suggesting_userid = $1', [userId]);
    }

    function handleConfirmationResults(bot, channelId) {
        return function(result) {
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
    }

    function handleError(bot, channelId) {
        return function(err) {
            botUtils.sendErrorMessage({
                bot: bot,
                channelId: channelId,
                message: 'There was an error when trying to confirm your prompt! `' + err + '`.'
            });
        }
    }

    return {
        requiresAdmin: false,
        aliases: [],
        processPrivateMessage: function(bot, user, userId, channelId, commandArgs, db) {
            confirmPreviouslyUnconfirmedPrompt(db, userId)
                .then(handleConfirmationResults(bot, channelId))
                .catch(handleError(bot, channelId));
        }
    };
})();