module.exports = (function() {
    'use strict';

    const botUtils = require('../bot_utils.js');

    function softPromptError(bot, channelId, message) {
        bot.sendMessage({
            to: channelId,
            message: ':diamond_shape_with_a_dot_inside: ' + message
        });
    }
    
    return {
        publicRequiresAdmin: false,
        privateRequiresAdmin: false,
        aliases: [],
        helpDescription: 'Asks Phil to remind you what the prompt of the day is.',
        processPublicMessage: function(bot, user, userId, channelId, commandArgs, db) {
            botUtils.isPromptDisabled(db)
                .then(isDisabled => {
                    if (isDisabled) {
                        softPromptError(bot, channelId, 'Daily prompts are temporarily disabled! Feel free to ping an admin and ask why and when they\'ll be back online.');
                        return;
                    }

                    const today = new Date();
                    db.query('SELECT prompt_number, prompt_text FROM hijack_prompts WHERE has_been_posted = E\'1\' AND prompt_date = $1', [today])
                        .then(results => {
                            if (results.rowCount === 0) {
                                softPromptError(bot, channelId, 'There\'s no prompt for today. That probably means that I\'m out of them! Why don\'t you suggest more by sending me `' + process.env.COMMAND_PREFIX + 'suggest` and including your prompt?');
                                return;
                            }

                            botUtils.sendHijackPrompt(bot, results.rows[0].prompt_number, results.rows[0].prompt_text, channelId);
                        });
                });
        }
    };
})();