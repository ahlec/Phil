'use strict';

const discord = require('../promises/discord');
const serverConfigs = require('../phil/server-configs');
const prompts = require('../phil/prompts');
const botUtils = require('../phil/utils');

function getMessageForBucketCount(bucketCount) {
    if (bucketCount.numUnconfirmed === 1) {
        return 'There is **1** unconfirmed prompt waiting in bucket `' + bucketCount.handle + '`.';
    }

    return 'There are **' + bucketCount.numUnconfirmed + '** prompts waiting in bucket `' + bucketCount.handle + '`.';
}

function getUnconfimedPromptsMessage(counts) {
    if (!counts || counts.length === 0) {
        return '';
    }

    var message = '';
    for (let bucketCount of counts) {
        message += getMessageForBucketCount(bucketCount);
        message += '\n';
    }

    message += '\n';

    var randomBucketCount = botUtils.getRandomArrayEntry(counts);
    message += 'You can say `' + process.env.COMMAND_PREFIX + 'unconfirmed ' + randomBucketCount.handle + '` to start the confirmation process.';
    return message;
}

function sendAlertMessage(bot, serverConfig, unconfirmedMessage) {
    if (unconfirmedMessage.length === 0) {
        return;
    }

    return discord.sendEmbedMessage(bot, serverConfig.botControlChannelId, {
        color: 0xB0E0E6,
        title: ':ballot_box: Unconfirmed Prompt Submissions',
        description: unconfirmedMessage
    });
}

module.exports = {
    canProcess: function(bot, db, serverId, now) {
        return true;
    },

    process: function(bot, db, serverId, now) {
        return serverConfigs.getFromId(bot, db, serverId)
            .then(serverConfig => {
                return prompts.countUnconfirmedPromptsForServer(db, serverId)
                    .then(getUnconfimedPromptsMessage)
                    .then(unconfirmedMessage => sendAlertMessage(bot, serverConfig, unconfirmedMessage));
            });
    }
};
