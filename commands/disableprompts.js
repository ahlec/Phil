module.exports = (function() {
    'use strict';

    const botUtils = require('../bot_utils.js');

    return {
        publicRequiresAdmin: true,
        privateRequiresAdmin: true,
        aliases: [],
        processPublicMessage: function(bot, user, userId, channelId, commandArgs, db) {
            botUtils.isPromptDisabled(db)
                .then(isDisabled => {
                    if (isDisabled) {
                        botUtils.sendSuccessMessage({
                            bot: bot,
                            channelId: channelId,
                            message: 'Prompts were already disabled, but will continue to stay disabled.'
                        });
                        return;
                    }

                    db.query('INSERT INTO info(key, value) VALUES(\'prompt_disabled\', \'1\')')
                        .then(results => {
                            if (results.rowCount > 0) {
                                botUtils.sendSuccessMessage({
                                    bot: bot,
                                    channelId: channelId,
                                    message: 'Prompts are now disabled until you use `' + process.env.COMMAND_PREFIX + 'enableprompts`.'
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
                                message: 'Database error when attempting to disable prompts. `' + err + '`'
                            });
                        });
                });
        }
    };
})();