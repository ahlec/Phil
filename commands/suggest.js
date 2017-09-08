module.exports = (function() {
    'use strict';

    const botUtils = require('../bot_utils.js');

    function clearOutPreviouslyUnconfirmedPrompts(db, userId) {
        return db.query('DELETE FROM hijack_prompts WHERE suggesting_userid = $1 AND approved_by_user = E\'0\'', [userId]);
    }

    function addNewPrompt(db, user, userId, prompt) {
        return db.query('INSERT INTO hijack_prompts(suggesting_user, suggesting_userid, date_suggested, prompt_text) VALUES($1, $2, CURRENT_TIMESTAMP, $3)', [user, userId, prompt]);
    }

    function sendConfirmationMessage(bot, channelId, prompt) {
        return function() {
            bot.sendMessage({
                to: channelId,
                message: ':diamond_shape_with_a_dot_inside: You\'ve suggested the prompt "**' + prompt + '**".\n' +
                    '* If you\'re satisfied with this, please say `' + process.env.COMMAND_PREFIX + 'confirm`.\n' +
                    '* If you want to change it or cancel it, use `' + process.env.COMMAND_PREFIX + 'suggest` again to cancel this, or do nothing.'
            });
        }
    }

    function handleError(bot, channelId) {
        return function(err) {
            botUtils.sendErrorMessage({
                bot: bot,
                channelId: channelId,
                message: 'There was an error when trying to add your prompt! `' + err + '`.'
            });
        }
    }

    return {
        requiresAdmin: false,
        aliases: [],
        processPrivateMessage: function(bot, user, userId, channelId, commandArgs, db) {
            const prompt = commandArgs.join(' ').trim();
            if (prompt.length === 0) {
                botUtils.sendErrorMessage({
                    bot: bot,
                    channelId: channelId,
                    message: 'You must provide a prompt to suggest!'
                });
                return;
            }

            clearOutPreviouslyUnconfirmedPrompts(db, userId)
                .then(addNewPrompt(db, user, userId, prompt))
                .then(sendConfirmationMessage(bot, channelId, prompt))
                .catch(handleError(bot, channelId));
        }
    };
})();