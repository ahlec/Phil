'use strict';

const prompts = require('../phil/prompts');
const buckets = require('../phil/buckets');
const serverConfigs = require('../phil/server-configs');
const discord = require('../promises/discord');

const PROMPT_QUEUE_EMPTY_ALERT_THRESHOLD = 5;

function alertQueueDwindling(bot, serverConfig, bucket, queueLength) {
    if (queueLength > PROMPT_QUEUE_EMPTY_ALERT_THRESHOLD) {
        return;
    }

    var are = (queueLength == 1 ? 'is' : 'are');
    var promptNoun = (queueLength == 1 ? 'prompt' : 'prompts');

    var message = ':warning: The queue for **' + bucket.displayName + '** (`' + bucket.handle + '`) is growing short. There ' + are + ' **' + (queueLength > 0 ? queueLength : 'no') + '** more ' + promptNoun + ' in the queue.';
    return discord.sendMessage(bot, serverConfig.botControlChannelId, message);
}

function processBucket(bot, db, serverConfig, now, bucket) {
    if (!bucket.isValid || bucket.isPaused || !bucket.alertWhenLow) {
        return;
    }

    return prompts.getPromptQueueLength(db, bucket)
        .then(queueLength => alertQueueDwindling(bot, serverConfig, bucket, queueLength));
}

module.exports = function(bot, db, serverId, now) {
    return serverConfigs.getFromId(bot, db, serverId)
        .then(serverConfig => {
            return buckets.getAllForServer(bot, db, serverId)
                .then(buckets => {
                    for (let bucket of buckets) {
                        processBucket(bot, db, serverConfig, now, bucket);
                    }
                });
        });
};
