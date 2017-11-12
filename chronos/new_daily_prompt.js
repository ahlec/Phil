module.exports = (function() {
    'use strict';

    const features = require('../phil/features');
    const botUtils = require('../phil/utils');
    const prompts = require('../phil/prompts');
    const discord = require('../promises/discord');

    function _processQueueLength(bot, queueLength) {
        if (queueLength >= process.env.PROMPT_QUEUE_EMPTY_ALERT_THRESHOLD) {
            return;
        }

        var are = (queueLength == 1 ? 'is' : 'are');
        var promptNoun = (queueLength == 1 ? 'prompt' : 'prompts');

        var message = ':warning: The prompt queue is growing short. There ' + are + ' **' + (queueLength > 0 ? queueLength : 'no') + '** more ' + promptNoun + ' in the queue.';
        return discord.sendMessage(bot, process.env.BOT_CONTROL_CHANNEL_ID, message);
    }

    function _handleRemainingQueue(db, bot) {
        if (process.env.PROMPT_QUEUE_EMPTY_ALERT_THRESHOLD <= 0) {
            return;
        }

        return prompts.getPromptQueueLength(db)
            .then(queueLength => _processQueueLength(bot, queueLength));
    }

    function _handleHasBeenPostedResults(results, bot, promptNumber, promptText) {
        if (results.rowCount === 0) {
            return Promise.reject('We found a prompt in the queue, but we couldn\'t update it to mark it as being posted.');
        }

        return prompts.sendPromptToChannel(bot, process.env.HIJACK_CHANNEL_ID, promptNumber, promptText );
    }

    function selectNextUnpublishedPromptAndContinue(chronosManager, now, bot, db, promptNumber) {
        return prompts.getPromptQueue(db, 1)
            .then(queue => {
                if (queue.length === 0) {
                    return Promise.resolve(false);
                }

                const promptId = queue[0].promptId;
                const promptText = queue[0].promptText;
                return db.query('UPDATE hijack_prompts SET has_been_posted = E\'1\', prompt_number = $1, prompt_date = $2 WHERE prompt_id = $3', [promptNumber, now, promptId])
                    .then(results => _handleHasBeenPostedResults(results, bot, promptNumber, promptText))
                    .then(() => _handleRemainingQueue(db, bot))
                    .then(() => true);
            });
    }

    function getNextPromptNumberAndContinue(chronosManager, now, bot, db) {
        return db.query('SELECT prompt_number FROM hijack_prompts WHERE has_been_posted = E\'1\' ORDER BY prompt_number DESC LIMIT 1')
            .then(promptNumberResults => {
                var promptNumber = 1;
                if (promptNumberResults.rowCount > 0) {
                    promptNumber = promptNumberResults.rows[0].prompt_number + 1;
                }

                return selectNextUnpublishedPromptAndContinue(chronosManager, now, bot, db, promptNumber);
            });
    }

    return {
        name: 'new daily prompt',
        hourUtc: 12, // 8am EST, 5am PST
        canProcess: function(chronosManager, now, bot, db) {
            return new Promise((resolve, reject) => {
                db.query('SELECT count(*) FROM hijack_prompts WHERE prompt_date = $1', [now])
                    .then(results => {
                        if (results.rows[0].count > 0) {
                            console.log('1');
                            resolve({
                                ready: false
                            }); // There's already a prompt for today
                            return;
                        }

                        const minutesSinceLastHijackMessage = chronosManager.getMinutesSinceLastMessageInChannel(process.env.HIJACK_CHANNEL_ID, now);
                        if (minutesSinceLastHijackMessage < chronosManager.MinimumSilenceRequiredBeforePostingInChannel) {
                            console.log('2');
                            resolve({
                                ready: false,
                                retryIn: (chronosManager.MinimumSilenceRequiredBeforePostingInChannel - minutesSinceLastHijackMessage + 1)
                            });
                        } else {
                            console.log('3');
                            resolve({
                                ready: true
                            });
                        }
                    })
                    .catch(err => {
                        reject(err);
                    })
            });
        },
        process: function(chronosManager, now, bot, db) {
            return new Promise((resolve, reject) => {
                features.getIsFeatureEnabled(features.Features.DailyPrompts, db)
                    .then(arePromptsEnabled => {
                        if (!arePromptsEnabled) {
                            console.log('prompts are disabled, so we won\'t process a new prompt today.');
                            resolve(false);
                            return;
                        }

                        getNextPromptNumberAndContinue(chronosManager, now, bot, db)
                            .then(result => {
                                resolve(result);
                            });
                    })
                    .catch(err => {
                        reject(err);
                    });
            });
        }
    };
})();
