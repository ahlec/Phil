module.exports = (function() {
    const botUtils = require('./bot_utils.js');
    const refreshTime = 1000 * 60 * 60; // check every hour
    const timeBetweenPromptReminder = 1000 * 60 * 60 * 6; // Remind of the daily prompt every six hours

    var _bot;
    var _db;
    var _timeSinceLastPromptPostedToHijackChannel = timeBetweenPromptReminder;

    function sendErrorMessage(message) {
        botUtils.sendErrorMessage({
            bot: _bot,
            channelId: process.env.ADMIN_CHANNEL_ID,
            message: message
        });
    }

    function selectNewPrompt(promptNumber) {
        _db.query('SELECT prompt_id, prompt_text FROM hijack_prompts WHERE has_been_posted = E\'0\' AND approved_by_user = E\'1\' AND approved_by_admin = E\'1\' LIMIT 1')
            .then(results => {
                if (results.rowCount === 0) {
                    sendErrorMessage({
                        bot: _bot,
                        channelId: process.env.ADMIN_CHANNEL_ID,
                        message: 'I couldn\'t post a prompt in the #hijack channel because there are no confirmed, unpublished prompts.'
                    });
                    return;
                }

                const today = new Date();
                const promptId = results.rows[0].prompt_id;
                const promptText = results.rows[0].prompt_text;
                _db.query('UPDATE hijack_prompts SET has_been_posted = E\'1\', prompt_number = $1, prompt_date = $2 WHERE prompt_id = $3', [promptNumber, today, promptId])
                    .then(updateResults => {
                        _bot.sendMessage({
                            to: process.env.HIJACK_CHANNEL_ID,
                            message: ':snowflake: **HIJACK PROMPT OF THE DAY #' + promptNumber + '**: ' + promptText
                        });
                    });
            })
            .catch(err => {
                sendErrorMessage('There was an error when selecting the next prompt. `' + err + '`');
            })
    }

    function remindOfDailyPrompt(promptId) {
	    _bot.sendMessage({
            to: process.env.HIJACK_CHANNEL_ID,
            message: '!!! TODO (reminding)'
	    });
    }

    function checkPrompt() {
        _db.query('SELECT prompt_id, prompt_number, prompt_date FROM hijack_prompts WHERE prompt_date IS NOT NULL ORDER BY prompt_date DESC LIMIT 1')
            .then(results => {
                if (results.rowCount === 0) {
                    selectNewPrompt(1);
                    return;
                }


                const dateOfLastPrompt = results.rows[0].prompt_date;
                const dateRightNow = new Date();
                if (dateOfLastPrompt.toDateString() === dateRightNow.toDateString()) { // Same day as most recent prompt?
                    if (_timeSinceLastPromptPostedToHijackChannel <= 0) {
                        remindOfDailyPrompt(results.rows[0].prompt_id);
                        return;
                    }

                    // Do nothing
                    return;
                }

                selectNewPrompt(results.rows[0].prompt_number + 1);
            })
            .catch(err => {
                sendErrorMessage('There was an error when checking the prompt. `' + err + '`');
            });
    }

    return {
        start: function(bot, db) {
            _bot = bot;
            _db = db;

            setInterval(function() {
                _timeSinceLastPromptPostedToHijackChannel -= refreshTime;
                checkPrompt();
            }, refreshTime);
            checkPrompt(); // But also run at startup
        }
    };
})();