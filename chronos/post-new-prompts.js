'use strict';

const prompts = require('../phil/prompts');
const buckets = require('../phil/buckets');
const serverConfigs = require('../phil/server-configs');

function isCurrentPromptOutdated(currentPrompt, now, bucket) {
    if (!currentPrompt || !currentPrompt.datePosted) {
        return true;
    }

    return buckets.isFrequencyMet(bucket.frequency, currentPrompt.datePosted, now);
}

function processBucket(bot, db, serverConfig, now, bucket) {
    if (bucket.isPaused || !bucket.isValid) {
        return;
    }

    return prompts.getCurrentPrompt(bot, db, bucket)
        .then(currentPrompt => {
            if (!isCurrentPromptOutdated(currentPrompt, now, bucket)) {
                console.log('[CHRONOS]    - bucket %s on server %s is not ready for a new prompt just yet', bucket.handle, serverConfig.serverId);
                return;
            }

            return prompts.getPromptQueue(db, bot, bucket, 1)
                .then(queue => {
                    if (queue.length === 0) {
                        return;
                    }

                    const prompt = queue[0];
                    return prompts.postNewPrompt(bot, db, prompt, now);
                });
        });
}

module.exports = function(bot, db, serverId, now) {
    return serverConfigs.getFromId(bot, db, serverId)
        .then(serverConfig => {
            return buckets.getAllForServer(bot, db, serverId)
                .then(serverBuckets => {
                    for (let bucket of serverBuckets) {
                        processBucket(bot, db, serverConfig, now, bucket);
                    }
                });
        });
};
