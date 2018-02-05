module.exports = (function() {
    'use strict';

    const features = require('../phil/features');
    const prompts = require('../phil/prompts');
    const buckets = require('../phil/buckets');
    const helpGroups = require('../phil/help-groups');
    const discord = require('../promises/discord');
    const botUtils = require('../phil/utils');
    const MAX_QUEUE_DISPLAY_LENGTH = 10;

    function _createMultipleUnspecifiedBucketsError(serverBuckets) {
        if (serverBuckets.length === 0) {
            return Promise.reject('There are no prompt buckets configured on this server.');
        }

        var message = 'This command must be provided the valid reference handle of one of the buckets configured on this server:\n\n';

        for (let bucket of serverBuckets) {
            message += '`' + bucket.handle + '` - ' + bucket.displayName + ' (';

            if (bucket.isValid) {
                message += 'posts to <#' + bucket.channelId + '>';
            } else {
                message += 'configuration invalid'
            }

            message += ')\n';
        }

        const randomBucket = botUtils.getRandomArrayEntry(serverBuckets);
        message += '\nPlease try the command once more, specifying which bucket, like `' + process.env.COMMAND_PREFIX + 'queue ' + randomBucket.handle + '`.';
        return Promise.reject(message);
    }

    function _getOnlyBucketOnServer(serverBuckets) {
        if (serverBuckets.length === 1 && serverBuckets[0].isValid) {
            return serverBuckets[0];
        }

        return _createMultipleUnspecifiedBucketsError(serverBuckets);
    }

    function getFirstParameterFromCommandArgs(commandArgs) {
        const input = commandArgs.join(' ').trim();
        if (input.length === 0) {
            return null;
        }

        const indexFirstSpace = input.indexOf(' ');
        if (indexFirstSpace < 0) {
            return input;
        }

        return input.substr(0, indexFirstSpace);
    }

    function retrieveBucket(bot, db, commandArgs, server) {
        const firstParameter = getFirstParameterFromCommandArgs(commandArgs);
        if (!firstParameter || firstParameter.length === 0) {
            return buckets.getAllForServer(bot, db, server)
                .then(_getOnlyBucketOnServer);
        }

        return buckets.getFromReferenceHandle(bot, db, firstParameter)
            .then(bucket => {
                if (bucket === null || !bucket.isValid) {
                    return buckets.getAllForServer(bot, db, server)
                        .then(_createMultipleUnspecifiedBucketsError);
                }

                return bucket;
            })
    }

    function _makeMessageOutOfQueue(queue) {
        if (queue.length === 0) {
            return ':large_blue_diamond: There are no prompts in the queue right now.';
        }

        var message = ':calendar_spiral: The queue currently contains **';
        if (queue.length === 1) {
            message += '1 prompt';
        } else if (queue.length === MAX_QUEUE_DISPLAY_LENGTH) {
            message += queue.length + ' (or more) prompts';
        } else {
            message += queue.length + ' prompts';
        }
        message += '**. Here\'s what to expect:\n\n';

        for (let index = 0; index < queue.length; ++index) {
            message += (index + 1) + '. ' + queue[index].text + '\n';
        }

        return message;
    }

    return {
        aliases: [],

        helpGroup: helpGroups.Groups.Prompts,
        helpDescription: 'Displays the current queue of approved prompts that will show up in chat shortly.',
        versionAdded: 7,

        publicRequiresAdmin: true,
        processPublicMessage: function(bot, message, commandArgs, db) {
            return features.ensureFeatureIsEnabled(features.Features.DailyPrompts, db)
                .then(() => retrieveBucket(bot, db, commandArgs, message.server))
                .then(bucket => prompts.getPromptQueue(db, bot, bucket, MAX_QUEUE_DISPLAY_LENGTH))
                .then(_makeMessageOutOfQueue)
                .then(response => discord.sendMessage(bot, message.channelId, response));
        }
    };
})();
