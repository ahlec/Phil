'use strict';

const features = require('../phil/features');
const botUtils = require('../phil/utils');
const prompts = require('../phil/prompts');
const discord = require('../promises/discord');

function branchCanProcessTodaysPrompt(chronosManager, now, bot, db, prompt) {
    if (prompt !== null) {
        return Promise.resolve({
            ready: false
        });
    }

    const minutesSinceLastHijackMessage = chronosManager.getMinutesSinceLastMessageInChannel(process.env.HIJACK_CHANNEL_ID, now);
    if (minutesSinceLastHijackMessage < chronosManager.MinimumSilenceRequiredBeforePostingInChannel) {
        return Promise.resolve({
            ready: false,
            retryIn: (chronosManager.MinimumSilenceRequiredBeforePostingInChannel - minutesSinceLastHijackMessage + 1)
        });
    }

    return Promise.resolve({
        ready: true
    });
}

function branchCanProcessFeatureEnabled(chronosManager, now, bot, db, isEnabled) {
    if (!isEnabled) {
        return Promise.resolve({
            ready: false
        });
    }

    const bucket = prompts.getBucketFromChannelId(db, process.env.HIJACK_CHANNEL_ID);
    return prompts.getTodaysPrompt(bot, db, bucket)
        .then(prompt => branchCanProcessTodaysPrompt(chronosManager, now, bot, db, prompt));
}

function handleHasBeenPostedResults(results, bot, promptNumber, prompt) {
    if (results.rowCount === 0) {
        return Promise.reject('We found a prompt in the queue, but we couldn\'t update it to mark it as being posted.');
    }

    return prompts.sendPromptToChannel(bot, process.env.HIJACK_CHANNEL_ID, promptNumber, prompt);
}

function postNewPrompt(chronosManager, now, bot, db, promptNumber) {
    const serverId = bot.channels[process.env.HIJACK_CHANNEL_ID].guild_id;
    const server = bot.servers[serverId];

    return prompts.getPromptQueue(db, bot, server, 1)
        .then(queue => {
            if (queue.length === 0) {
                return Promise.resolve(false);
            }

            const prompt = queue[0];
            return db.query('UPDATE prompts SET has_been_posted = E\'1\', prompt_number = $1, prompt_date = $2 WHERE prompt_id = $3', [promptNumber, now, prompt.promptId])
                .then(results => handleHasBeenPostedResults(results, bot, promptNumber, prompt))
                .then(() => true);
        });
}

function alertQueueDwindling(bot, queueLength) {
    if (queueLength >= parseInt(process.env.PROMPT_QUEUE_EMPTY_ALERT_THRESHOLD)) {
        return;
    }

    var are = (queueLength == 1 ? 'is' : 'are');
    var promptNoun = (queueLength == 1 ? 'prompt' : 'prompts');

    var message = ':warning: The prompt queue is growing short. There ' + are + ' **' + (queueLength > 0 ? queueLength : 'no') + '** more ' + promptNoun + ' in the queue.';
    return discord.sendMessage(bot, process.env.BOT_CONTROL_CHANNEL_ID, message);
}

function handleRemainingQueue(db, bot) {
    if (parseInt(process.env.PROMPT_QUEUE_EMPTY_ALERT_THRESHOLD) <= 0) {
        return;
    }

    return prompts.getPromptQueueLength(db)
        .then(queueLength => alertQueueDwindling(bot, queueLength));
}

module.exports = {
    name: 'new daily prompt',
    hourUtc: 12, // 8am EST, 5am PST

    canProcess: function(chronosManager, now, bot, db) {
        return features.getIsFeatureEnabled(features.Features.DailyPrompts, db)
            .then(isEnabled => branchCanProcessFeatureEnabled(chronosManager, now, bot, db, isEnabled));
    },

    process: function(chronosManager, now, bot, db) {
        return db.query('SELECT prompt_number FROM prompts WHERE has_been_posted = E\'1\' ORDER BY prompt_number DESC LIMIT 1')
            .then(results => (results.rowCount > 0 ? results.rows[0].prompt_number + 1 : 1))
            .then(promptNumber => postNewPrompt(chronosManager, now, bot, db, promptNumber))
            .then(() => handleRemainingQueue(db, bot))
            .then(() => true);
    }
};
