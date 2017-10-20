module.exports = (function() {
    'use strict';

    const botUtils = require('../bot_utils.js');

    function sendDatabaseError(bot, err) {
        botUtils.sendErrorMessage({
            bot: bot,
            channelId: process.env.BOT_CONTROL_CHANNEL_ID,
            message: 'There was an error trying to count the number of unconfirmed prompts in the database. `' + err + '`'
        });
    }

    function selectNumberOfUnconfirmedPrompts(db, bot) {
        return new Promise((resolve, reject) => {
            return db.query('SELECT count(*) FROM hijack_prompts WHERE approved_by_user = E\'1\' AND approved_by_admin= E\'0\'')
                .then(results => {
                    resolve(results.rows[0].count);
                })
                .catch(err => {
                    sendDatabaseError(bot, err);
                });
        });
    }

    function getUnconfimedPromptsMessage(numUnconfirmedPrompts) {
        var numberStrPortion;
        if (numUnconfirmedPrompts == 1) {
            numberStrPortion = 'is **1** unconfirmed prompt';
        } else {
            numberStrPortion = 'are **' + numUnconfirmedPrompts + '** unconfirmed prompts';
        }

        return ':large_blue_diamond: There ' + numberStrPortion + ' in the queue. Please use `' + process.env.COMMAND_PREFIX + 'unconfirmed` to confirm them.';
    }

    return {
        name: 'alert admins unconfirmed prompts',
        hourUtc: 15, // 11am EST, 8am PST

        canProcess: function(chronosManager, now, bot, db) {
            return new Promise((resolve, reject) => {
                const minutesSinceLastAdminMessage = chronosManager.getMinutesSinceLastMessageInChannel(process.env.BOT_CONTROL_CHANNEL_ID, now);
                if (minutesSinceLastAdminMessage < chronosManager.MinimumSilenceRequiredBeforePostingInChannel) {
                    resolve({
                        ready: false,
                        retryIn: (chronosManager.MinimumSilenceRequiredBeforePostingInChannel - minutesSinceLastAdminMessage + 1)
                    });
                } else {
                    resolve({
                        ready: true
                    });
                }
            });
        },

        process: function(chronosManager, now, bot, db) {
            return new Promise((resolve, reject) => {
                selectNumberOfUnconfirmedPrompts(db, bot)
                    .then(numUnconfirmedPrompts => {
                        if (numUnconfirmedPrompts > 0) {
                            const reportMessage = getUnconfimedPromptsMessage(numUnconfirmedPrompts);
                            console.log('[alert admins unconfirmed prompt] ' + reportMessage);
                            bot.sendMessage({
                                to: process.env.BOT_CONTROL_CHANNEL_ID,
                                message: reportMessage
                            });
                        } else {
                            console.log('[alert admins unconfirmed prompt] no prompts');
                        }
                        resolve(true);
                    })
                    .catch(function() {
                        console.log('[alert admins unconfirmed prompt] there was an error, which should have been send to #admin');
                    });
            });
        }
    };
})();