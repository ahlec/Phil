module.exports = (function() {
    'use strict';

    const botUtils = require('../bot_utils.js');

    return {
        publicRequiresAdmin: true,
        privateRequiresAdmin: true,
        aliases: [],
        helpDescription: 'Lets Phil once again post daily prompts in the appropriate channel. Usable to undo `' + process.env.COMMAND_PREFIX + 'disableprompts`.',
        processPublicMessage: function(bot, user, userId, channelId, commandArgs, db) {
            botUtils.isPromptDisabled(db)
                .then(isDisabled => {
                    if (!isDisabled) {
                        botUtils.sendSuccessMessage({
                            bot: bot,
                            channelId: channelId,
                            message: 'Prompts weren\'t disabled, but they\'ll continue to stay that way (not disabled, that is).'
                        });
                        return;
                    }

                    db.query('DELETE FROM info WHERE key = \'prompt_disabled\'')
                        .then(results => {
                            if (results.rowCount > 0) {
                                botUtils.sendSuccessMessage({
                                    bot: bot,
                                    channelId: channelId,
                                    message: 'Prompts are no longer disabled. You can disbled again using `' + process.env.COMMAND_PREFIX + 'disableprompts`.'
                                });
                                return;
                            }

                            botUtils.sendErrorMessage({
                                bot: bot,
                                channelId: channelId,
                                message: 'Nothing completely broke, but the database wasn\'t actually modified.'
                            });
                        })
                        .catch(err => {
                            botUtils.sendErrorMessage({
                                bot: bot,
                                channelId: channelId,
                                message: 'Database error when attempting to enable prompts. `' + err + '`'
                            });
                        });
                });
        }
    };
})();