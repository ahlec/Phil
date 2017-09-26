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
        publicRequiresAdmin: true,
        privateRequiresAdmin: false,
        aliases: [],
        hideFromHelpListing: true,
        processPublicMessage: function(bot, user, userId, channelId, commandArgs, db) {
            if (commandArgs.length !== 1) {
                botUtils.sendErrorMessage({
                    bot: bot,
                    channelId: channelId,
                    message: 'You must provide a single parameter. This can be either an individual number, or a range of numbers.'
                });
                return;
            }

            const numbersToConfirm = botUtils.parseConfirmRejectArgument(commandArgs[0]);
            if (numbersToConfirm.length === 0) {
                botUtils.sendErrorMessage({
                    bot: bot,
                    channelId: channelId,
                    message: 'The argument `' + commandArgs[0] + '` was invalid and couldn\'t be parsed correctly.'
                });
                return;
            }

            var numFailedNumbers = 0;
            var numSuccessfulNumbers = 0;
            function confirmNumber(number) {
                number = number - 1; // Public facing, it's 1-based, but in the database it's 0-based
                return db.query('SELECT prompt_id FROM prompt_confirmation_queue WHERE channel_id = $1 and confirm_number = $2', [channelId, number])
                    .then(result => {
                        if (result.rowCount === 0) {
                            numFailedNumbers++;
                            return;
                        }

                        const promptId = result.rows[0].prompt_id;
                        db.query('UPDATE hijack_prompts SET approved_by_admin = E\'1\' WHERE prompt_id = $1', [promptId])
                            .then(updateResult => {
                                if (updateResult.rowCount === 0) {
                                    numFailedNumbers++;
                                    return;
                                }

                                db.query('DELETE FROM prompt_confirmation_queue WHERE channel_id = $1 AND confirm_number = $2', [channelId, number])
                                    .then(deleteResult => {
                                        numSuccessfulNumbers++;
                                    })
                            })
                    });
            }

            const promise = confirmNumber(numbersToConfirm[0]);
            for (let index = 1; index < numbersToConfirm.length; ++index) {
                promise.then(confirmNumber(numbersToConfirm[index]));
            }

            promise.then(function() {
                if (numFailedNumbers > 0 && numSuccessfulNumbers > 0) {
                    bot.sendMessage({
                        to: channelId,
                        message: ':warning: One or more of the prompts was confirmed, and one or more of the prompts was _not_. I\'d suggest calling `' + process.env.COMMAND_PREFIX + 'unconfirmed` again to refresh the list and see what was updated.'
                    });
                } else if (numFailedNumbers > 0) {
                    const noun = (numFailedNumbers === 1 ? 'Prompt' : 'Prompts');
                    const existenceVerb = (numFailedNumbers === 1 ? 'was' : 'were');
                    botUtils.sendErrorMessage({
                        bot: bot,
                        channelId: channelId,
                        message: noun + ' ' + existenceVerb + ' not confirmed. If you see no other error, that means that the ' + noun.toLowerCase() + ' ' + existenceVerb + ' already confirmed, or the input was an invalid number.'
                    });
                } else {
                    botUtils.sendSuccessMessage({
                        bot: bot,
                        channelId: channelId,
                        message: (numSuccessfulNumbers === 1 ? 'Prompt was' : 'Prompts were') + ' confirmed. You may continue using `' + process.env.COMMAND_PREFIX + 'confirm` or start over by using `' + process.env.COMMAND_PREFIX + 'unconfirmed`.'
                    });
                }
            }).catch(handleError(bot, channelId));
        },
        processPrivateMessage: function(bot, user, userId, channelId, commandArgs, db) {
            confirmPreviouslyUnconfirmedPrompt(db, userId)
                .then(handleConfirmationResults(bot, channelId))
                .catch(handleError(bot, channelId));
        }
    };
})();