module.exports = (function() {
    'use strict';

    const botUtils = require('../bot_utils.js');
    const MAX_LIST_LENGTH = 10;

    function clearPreviousConfirmListForChannel(db, channelId) {
        return db.query('DELETE FROM prompt_confirmation_queue WHERE channel_id = $1', [channelId]);
    }

    function addPromptToConfirmationQueue(db, channelId, promptId, index) {
        return db.query('INSERT INTO prompt_confirmation_queue VALUES($1, $2, $3)', [channelId, promptId, index]);
    }

    function outputList(bot, channelId, list) {
        return function() {
            const existenceVerb = (list.length === 1 ? 'is' : 'are');
            const noun = (list.length === 1 ? 'prompt' : 'prompts');
            var message = ':pencil: Here ' + existenceVerb + ' ' + list.length + ' unconfirmed ' + noun + '.';
            for (let index = 0; index < list.length; ++index) {
                message += '\n        `' + (index + 1) + '`: "' + list[index].prompt + '"';
            }
            message += '\nConfirm prompts with `' + process.env.COMMAND_PREFIX + 'confirm`. You can specify a single prompt by using its number (`';
            message += process.env.COMMAND_PREFIX + 'confirm 3`) or a range of prompts using a hyphen (`' + process.env.COMMAND_PREFIX + 'confirm 2-7`)';
            bot.sendMessage({
                to: channelId,
                message: message
            });
        }
    }

    function outputNoUnconfirmedPrompts(bot, channelId) {
        bot.sendMessage({
            to: channelId,
            message: ':large_blue_diamond: There are no unconfirmed prompts in the queue right now.'
        });
    }

    function createConfirmationQueue(db, bot, channelId) {
        return db.query('SELECT prompt_id, suggesting_user, prompt_text FROM hijack_prompts WHERE approved_by_user = E\'1\' AND approved_by_admin = E\'0\' ORDER BY date_suggested ASC LIMIT $1', [MAX_LIST_LENGTH])
            .then(results => {
                var promise;
                var list = [];
                for (let index = 0; index < results.rowCount; ++index) {
                    list.push({
                        index: index,
                        user: results.rows[index].suggesting_user,
                        prompt: results.rows[index].prompt_text
                    });
                    if (promise) {
                        promise.then(addPromptToConfirmationQueue(db, channelId, results.rows[index].prompt_id, index));
                    } else {
                        promise = addPromptToConfirmationQueue(db, channelId, results.rows[index].prompt_id, index);
                    }
                }

                if (promise) {
                    return promise.then(outputList(bot, channelId, list));
                } else {
                    outputNoUnconfirmedPrompts(bot, channelId);
                }
            });
    }

    function handleError(bot, channelId) {
        return function(err) {
            botUtils.sendErrorMessage({
                bot: bot,
                channelId: channelId,
                message: 'There was an error when trying to list unconfirmed prompts! `' + err + '`.'
            });
        }
    }

    return {
        requiresAdmin: true,
        aliases: [],
        processPublicMessage: function(bot, user, userId, channelId, commandArgs, db) {
            clearPreviousConfirmListForChannel(db, channelId)
                .then(createConfirmationQueue(db, bot, channelId))
                .catch(handleError(bot, channelId));
        }
    };
})();