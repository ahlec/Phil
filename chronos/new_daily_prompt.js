module.exports = (function() {
    'use strict';

    const botUtils = require('../bot_utils.js');

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
            return db.query('SELECT prompt_number FROM hijack_prompts WHERE has_been_posted = E\'1\' ORDER BY prompt_number DESC LIMIT 1')
                .then(promptNumberResults => {
                    var promptNumber = 1;
                    if (promptNumberResults.rowCount > 0) {
                        promptNumber = promptNumberResults.rows[0].prompt_number + 1;
                    }

                    return db.query('SELECT prompt_id, prompt_text FROM hijack_prompts WHERE has_been_posted = E\'0\' AND approved_by_user = E\'1\' AND approved_by_admin = E\'1\' LIMIT 1')
                        .then(results => {
                            if (results.rowCount === 0) {
                                // TODO: Make not spam as frequently
                                //chronosManager.sendErrorMessage('I couldn\'t post a prompt in the #hijack channel because there are no confirmed, unpublished prompts.');
                                return;
                            }

                            const promptId = results.rows[0].prompt_id;
                            const promptText = results.rows[0].prompt_text;
                            return db.query('UPDATE hijack_prompts SET has_been_posted = E\'1\', prompt_number = $1, prompt_date = $2 WHERE prompt_id = $3', [promptNumber, now, promptId])
                                .then(updateResults => {
                                    return new Promise((resolve, reject) => {
                                        botUtils.sendHijackPrompt(bot, promptNumber, promptText);
                                        resolve();
                                    });
                                });
                        })
                });
        }
    };
})();