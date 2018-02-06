'use strict';

const assert = require('assert');
const botUtils = require('../phil/utils');

function determineIsBucketValid(dbRow, bot) {
    const server = bot.servers[dbRow.server_id];
    if (!server) {
        return false;
    }

    if (!(dbRow.channel_id in server.channels)) {
        return false;
    }

    if (dbRow.required_role_id) {
        if (!(dbRow.required_role_id in server.roles)) {
            return false;
        }
    }

    return true;
}

function parseBucketDbResult(dbRow, bot) {
    var isValid = determineIsBucketValid(dbRow, bot);
    return {
        id: parseInt(dbRow.bucket_id),
        serverId: dbRow.server_id,
        channelId: dbRow.channel_id,
        isValid: isValid,
        handle: dbRow.reference_handle,
        displayName: dbRow.display_name,
        isPaused: (parseInt(dbRow.is_paused) === 1),
        shouldPinPosts: (parseInt(dbRow.should_pin_posts) === 1),
        requiredRoleId: dbRow.required_role_id
    };
}

function _getFirstParameterFromCommandArgs(commandArgs) {
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

function _createMultipleUnspecifiedBucketsError(serverBuckets, commandName) {
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
    message += '\nPlease try the command once more, specifying which bucket, like `' + process.env.COMMAND_PREFIX + commandName + ' ' + randomBucket.handle + '`.';
    return Promise.reject(message);
}

function _getOnlyBucketOnServer(serverBuckets, commandName, allowInvalidServers) {
    if (serverBuckets.length === 1 && (allowInvalidServers || erverBuckets[0].isValid)) {
        return serverBuckets[0];
    }

    return _createMultipleUnspecifiedBucketsError(serverBuckets, commandName);
}

function getFromChannelId(bot, db, channelId) {
    return db.query('SELECT * FROM prompt_buckets WHERE channel_id = $1', [channelId])
        .then(results => {
            if (results.rowCount === 0) {
                return null;
            }

            assert(results.rowCount === 1);
            return parseBucketDbResult(results.rows[0], bot);
        });
}

function getFromReferenceHandle(bot, db, server, referenceHandle) {
    return db.query('SELECT * FROM prompt_buckets WHERE server_id = $1 AND reference_handle = $2', [server.id, referenceHandle])
        .then(results => {
            if (results.rowCount === 0) {
                return null;
            }

            assert(results.rowCount === 1);
            return parseBucketDbResult(results.rows[0], bot);
        });
}

function getAllForServer(bot, db, server) {
    return db.query('SELECT * FROM prompt_buckets WHERE server_id = $1', [server.id])
        .then(results => {
            const buckets = [];

            for (let index = 0; index < results.rowCount; ++index) {
                buckets.push(parseBucketDbResult(results.rows[index], bot));
            }

            return buckets;
        });
}

module.exports = {
    getFromChannelId: getFromChannelId,
    getFromReferenceHandle: getFromReferenceHandle,
    getAllForServer: getAllForServer,

    retrieveFromCommandArgs: function(bot, db, commandArgs, server, commandName, allowInvalidServers) {
        const firstParameter = _getFirstParameterFromCommandArgs(commandArgs);
        if (!firstParameter || firstParameter.length === 0) {
            return getAllForServer(bot, db, server)
                .then(serverBuckets => _getOnlyBucketOnServer(serverBuckets, commandName, allowInvalidServers));
        }

        return getFromReferenceHandle(bot, db, server, firstParameter)
            .then(bucket => {
                if (bucket === null || (!allowInvalidServers && !bucket.isValid)) {
                    return getAllForServer(bot, db, server)
                        .then(serverBuckets => _createMultipleUnspecifiedBucketsError(serverBuckets, commandName));
                }

                return bucket;
            });
    }
};
