'use strict';

const discord = require('../promises/discord');

function getUnconfimedPromptsMessage(numUnconfirmedPrompts) {
    if (numUnconfirmedPrompts == 0) {
        return '';
    }

    var numberStrPortion;
    if (numUnconfirmedPrompts == 1) {
        numberStrPortion = 'is **1** unconfirmed prompt';
    } else {
        numberStrPortion = 'are **' + numUnconfirmedPrompts + '** unconfirmed prompts';
    }

    return ':large_blue_diamond: There ' + numberStrPortion + ' in the queue. Please use `' + process.env.COMMAND_PREFIX + 'unconfirmed` to confirm them.';
}

function sendAlertMessage(bot, unconfirmedMessage) {
    if (unconfirmedMessage.length === 0) {
        return;
    }

    return discord.sendMessage(bot, process.env.BOT_CONTROL_CHANNEL_ID, unconfirmedMessage);
}

module.exports = {
    name: 'alert admins unconfirmed prompts',
    hourUtc: 15, // 11am EST, 8am PST

    canProcess: function(chronosManager, now, bot, db) {
        const minutesSinceLastMessage = chronosManager.getMinutesSinceLastMessageInChannel(process.env.BOT_CONTROL_CHANNEL_ID, now);
        if (minutesSinceLastMessage < chronosManager.MinimumSilenceRequiredBeforePostingInChannel) {
            return Promise.resolve({
                ready: false,
                retryIn: (chronosManager.MinimumSilenceRequiredBeforePostingInChannel - minutesSinceLastMessage + 1)
            });
        }

        return Promise.resolve({
            ready: true
        });
    },

    process: function(chronosManager, now, bot, db) {
        return db.query('SELECT count(*) FROM hijack_prompts WHERE approved_by_admin = E\'0\'')
            .then(results => results.rows[0].count)
            .then(getUnconfimedPromptsMessage)
            .then(unconfirmedMessage => sendAlertMessage(bot, unconfirmedMessage))
            .then(() => true);
    }
};
