module.exports = (function() {
    const botUtils = require('./bot_utils.js');
    const refreshTime = 1000 * 60 * 60; // check every hour
    const timeBetweenPromptReminder = 1000 * 60 * 60 * 6; // Remind of the daily prompt every six hours
    const minimumTimeAfterLastMessageThatPostingInHijackChannelAllowed = 1000 * 60 * 10; // Hijack channel must be silent for ten minutes to be allowed to post

    var _bot;
    var _db;
    var _timeSinceLastPromptPostedToHijackChannel = timeBetweenPromptReminder;
    var _dateTimeLastMessagePostedInHijackChannel;
    var _intervalToCreateNewPrompt;
    var _intervalToSendPromptReminder;

    function canPostToHijackChannel() {
        if (_dateTimeLastMessagePostedInHijackChannel === undefined) {
            return true;
        }

        const dateTimeRightNow = new Date();
        const millisecondsSinceLastMessage = (dateTimeRightNow - _dateTimeLastMessagePostedInHijackChannel);
        return (millisecondsSinceLastMessage >= minimumTimeAfterLastMessageThatPostingInHijackChannelAllowed);
    }

    function sendErrorMessage(message) {
        botUtils.sendErrorMessage({
            bot: _bot,
            channelId: process.env.ADMIN_CHANNEL_ID,
            message: message
        });
    }

    function sendPrompt(promptNumber, promptText) {
        _bot.sendMessage({
            to: process.env.HIJACK_CHANNEL_ID,
            message: ':snowflake: **HIJACK PROMPT OF THE DAY #' + promptNumber + '**: ' + promptText
        });
        _timeSinceLastPromptPostedToHijackChannel = timeBetweenPromptReminder;
    }

    function chooseAndSendNewPrompt(promptNumber) {
        _db.query('SELECT prompt_id, prompt_text FROM hijack_prompts WHERE has_been_posted = E\'0\' AND approved_by_user = E\'1\' AND approved_by_admin = E\'1\' LIMIT 1')
            .then(results => {
                if (results.rowCount === 0) {
                    // TODO: Make not spam as frequently
                    //sendErrorMessage('I couldn\'t post a prompt in the #hijack channel because there are no confirmed, unpublished prompts.');
                    return;
                }

                const today = new Date();
                const promptId = results.rows[0].prompt_id;
                const promptText = results.rows[0].prompt_text;
                _db.query('UPDATE hijack_prompts SET has_been_posted = E\'1\', prompt_number = $1, prompt_date = $2 WHERE prompt_id = $3', [promptNumber, today, promptId])
                    .then(updateResults => {
                        sendPrompt(promptNumber, promptText);
                    });
            })
            .catch(err => {
                sendErrorMessage('There was an error when selecting the next prompt. `' + err + '`');
            });
    }

    function selectNewPrompt(promptNumber) {
        if (_intervalToSendPromptReminder) {
            clearInterval(_intervalToSendPromptReminder);
            _intervalToSendPromptReminder = undefined;
        }

        if (canPostToHijackChannel()) {
            if (_intervalToCreateNewPrompt) {
                clearInterval(_intervalToCreateNewPrompt);
                _intervalToCreateNewPrompt = undefined;
            }
            chooseAndSendNewPrompt(promptNumber);
            return;
        }

        console.log('NOT READY TO CHOOSE NEW PROMPT (too soon after last message)');

        const timeRightNow = new Date();
        const millisecondsSinceLastMessage = timeRightNow - _dateTimeLastMessagePostedInHijackChannel;
        const millisecondsUntilTimeRequirementReached = (minimumTimeAfterLastMessageThatPostingInHijackChannelAllowed - millisecondsSinceLastMessage);
        if (_intervalToCreateNewPrompt) {
            clearInterval(_intervalToCreateNewPrompt);
            _intervalToCreateNewPrompt = undefined;
        }
        _intervalToCreateNewPrompt = setInterval(function() {
            selectNewPrompt(promptNumber);
        }, millisecondsUntilTimeRequirementReached);
    }

    function sendDailyPromptReminder() {
        const today = new Date();
        _db.query('SELECT prompt_number, prompt_text FROM hijack_prompts WHERE prompt_date = $1', [today])
            .then(results => {
                if (results.rowCount === 0) {
                    return;
                }

                const promptNumber = results.rows[0].prompt_number;
                const promptText = results.rows[0].prompt_text;
                sendPrompt(promptNumber, promptText);
            })
            .catch(err => {
                sendErrorMessage('There was an error when attempting to remind the channel of the daily prompt. `' + err + '`');
            });
    }

    function remindOfDailyPrompt() {
        if (_intervalToCreateNewPrompt) {
            if (_intervalToSendPromptReminder) {
                clearInterval(_intervalToSendPromptReminder);
                _intervalToSendPromptReminder = undefined;
            }
            return;
        }

        if (canPostToHijackChannel()) {
            if (_intervalToSendPromptReminder) {
                clearInterval(_intervalToSendPromptReminder);
                _intervalToSendPromptReminder = undefined;
            }
            sendDailyPromptReminder();
            return;
        }

        console.log('NOT READY TO SEND PROMPT REMINDER (too soon after last message)');

        const timeRightNow = new Date();
        const millisecondsSinceLastMessage = timeRightNow - _dateTimeLastMessagePostedInHijackChannel;
        const millisecondsUntilTimeRequirementReached = (minimumTimeAfterLastMessageThatPostingInHijackChannelAllowed - millisecondsSinceLastMessage);
        if (_intervalToSendPromptReminder) {
            clearInterval(_intervalToSendPromptReminder);
            _intervalToSendPromptReminder = undefined;
        }
        _intervalToSendPromptReminder = setInterval(remindOfDailyPrompt, millisecondsUntilTimeRequirementReached);
    }

    function checkPrompt() {
        _db.query('SELECT prompt_number, prompt_date FROM hijack_prompts WHERE prompt_date IS NOT NULL ORDER BY prompt_date DESC LIMIT 1')
            .then(results => {
                if (results.rowCount === 0) {
                    selectNewPrompt(1);
                    return;
                }

                const dateOfLastPrompt = results.rows[0].prompt_date;
                const dateRightNow = new Date();
                if (dateOfLastPrompt.toDateString() === dateRightNow.toDateString()) { // Same day as most recent prompt?
                    if (_timeSinceLastPromptPostedToHijackChannel <= 0) {
                        remindOfDailyPrompt();
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
                if (_timeSinceLastPromptPostedToHijackChannel > 0) {
                    _timeSinceLastPromptPostedToHijackChannel -= refreshTime;
                }
                console.log('refreshing prompt. ms until next reminder:' + _timeSinceLastPromptPostedToHijackChannel);
                checkPrompt();
            }, refreshTime);
            checkPrompt(); // But also run at startup
        },

        recordNewMessageInHijackChannel: function() {
            _dateTimeLastMessagePostedInHijackChannel = new Date();
        }
    };
})();