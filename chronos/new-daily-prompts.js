'use strict';

const features = require('../phil/features');
const botUtils = require('../phil/utils');
const prompts = require('../phil/prompts');
const buckets = require('../phil/buckets');
const serverConfigs = require('../phil/server-configs');
const discord = require('../promises/discord');

function handleHasBeenPostedResults(results, bot, bucket, promptNumber, prompt) {
    if (results.rowCount === 0) {
        return Promise.reject('We found a prompt in the queue, but we couldn\'t update it to mark it as being posted.');
    }

    return prompts.sendPromptToChannel(bot, bucket.channelId, promptNumber, prompt);
}

function postNewPrompt(bot, db, serverId, now, bucket, promptNumber) {
    const server = bot.servers[serverId];

    return prompts.getPromptQueue(db, bot, bucket, 1)
        .then(queue => {
            if (queue.length === 0) {
                return;
            }

            const prompt = queue[0];
            return db.query('UPDATE prompts SET has_been_posted = E\'1\', prompt_number = $1, prompt_date = $2 WHERE prompt_id = $3', [promptNumber, now, prompt.promptId])
                .then(results => handleHasBeenPostedResults(results, bot, bucket, promptNumber, prompt));
        });
}

function processBucket(bot, db, serverConfig, now, bucket) {
    if (bucket.isPaused || !bucket.isValid) {
        return;
    }

    return db.query('SELECT prompt_number FROM prompts WHERE has_been_posted = E\'1\' AND bucket_id = $1 ORDER BY prompt_number DESC LIMIT 1', [bucket.id])
        .then(results => (results.rowCount > 0 ? results.rows[0].prompt_number + 1 : 1))
        .then(promptNumber => postNewPrompt(bot, db, serverConfig.serverId, now, bucket, promptNumber));
}

module.exports = {
    canProcess: function(bot, db, serverId, now) {
        return true;
    },

    process: function(bot, db, serverId, now) {
        return serverConfigs.getFromId(bot, db, serverId)
            .then(serverConfig => {
                return buckets.getAllForServer(bot, db, serverId)
                    .then(buckets => {
                        for (let bucket of buckets) {
                            processBucket(bot, db, serverConfig, now, bucket);
                        }
                    });
            });
    }
};
