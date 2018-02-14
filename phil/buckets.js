'use strict';

const assert = require('assert');
const botUtils = require('../phil/utils');
const moment = require('moment');

const FrequencyEnum = {
    Daily: 0,
    Weekly: 1,
    Monthly: 2,
    Yearly: 3,
    Immediately: 4
};

const frequencyDisplayStrings = {
    [FrequencyEnum.Daily]: "Daily",
    [FrequencyEnum.Weekly]: "Weekly",
    [FrequencyEnum.Monthly]: "Monthly",
    [FrequencyEnum.Yearly]: "Yearly",
    [FrequencyEnum.Immediately]: "Immediately"
};

const frequencyFromStrings = {
    "daily": FrequencyEnum.Daily,
    "weekly": FrequencyEnum.Weekly,
    "monthly": FrequencyEnum.Monthly,
    "yearly": FrequencyEnum.Yearly,
    "immediately": FrequencyEnum.Immediately
}

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
    var bucketFrequency = frequencyFromStrings[dbRow.frequency];
    assert(bucketFrequency);
    return {
        id: parseInt(dbRow.bucket_id),
        serverId: dbRow.server_id,
        channelId: dbRow.channel_id,
        isValid: isValid,
        handle: dbRow.reference_handle,
        displayName: dbRow.display_name,
        isPaused: (parseInt(dbRow.is_paused) === 1),
        shouldPinPosts: (parseInt(dbRow.should_pin_posts) === 1),
        requiredRoleId: dbRow.required_role_id,
        alertWhenLow: (parseInt(dbRow.alert_when_low) === 1),
        frequency: bucketFrequency,
        frequencyDisplayName: frequencyDisplayStrings[bucketFrequency],
        promptTitleFormat: dbRow.prompt_title_format
    };
}

function parseListBucketDbResults(results, bot) {
    const buckets = [];

    for (let index = 0; index < results.rowCount; ++index) {
        buckets.push(parseBucketDbResult(results.rows[index], bot));
    }

    return buckets;
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

function getAllForServer(bot, db, serverId) {
    return db.query('SELECT * FROM prompt_buckets WHERE server_id = $1', [serverId])
        .then(results => parseListBucketDbResults(results, bot));
}

function getAllServersUserIn(bot, userId) {
    const serverIds = [];

    for (let serverId in bot.servers) {
        let server = bot.servers[serverId];
        if (!server.members[userId]) {
            continue;
        }

        serverIds.push(serverId);
    }

    return serverIds;
}

module.exports = {
    Frequency: FrequencyEnum,

    getFromId: function(bot, db, bucketId) {
        return db.query('SELECT * FROM prompt_buckets WHERE bucket_id = $1', [bucketId])
            .then(results => {
                if (results.rowCount === 0) {
                    return null;
                }

                assert(results.rowCount === 1);
                return parseBucketDbResult(results.rows[0], bot);
            });
    },
    getFromChannelId: getFromChannelId,
    getFromReferenceHandle: getFromReferenceHandle,
    getAllForServer: getAllForServer,
    getAllForUser: function(bot, db, userId) {
        const serverIds = getAllServersUserIn(bot, userId);
        return db.query('SELECT * FROM prompt_buckets WHERE server_id = ANY($1)', [serverIds])
            .then(results => parseListBucketDbResults(results, bot));
    },

    retrieveFromCommandArgs: function(bot, db, commandArgs, server, commandName, allowInvalidServers) {
        const firstParameter = commandArgs[0];
        if (!firstParameter || firstParameter.length === 0) {
            return getAllForServer(bot, db, server.id)
                .then(serverBuckets => _getOnlyBucketOnServer(serverBuckets, commandName, allowInvalidServers));
        }

        return getFromReferenceHandle(bot, db, server, firstParameter)
            .then(bucket => {
                if (bucket === null || (!allowInvalidServers && !bucket.isValid)) {
                    return getAllForServer(bot, db, server.id)
                        .then(serverBuckets => _createMultipleUnspecifiedBucketsError(serverBuckets, commandName));
                }

                return bucket;
            });
    },

    setIsPaused: function(db, bucket, isPaused) {
        return db.query('UPDATE prompt_buckets SET is_paused = $1 WHERE bucket_id = $2', [(isPaused ? 1 : 0), bucket.id])
            .then(results => {
                if (results.rowCount === 0) {
                    return Promise.reject('Unable to update the status of the prompt bucket in the database.');
                }

                assert(results.rowCount === 1);
                return bucket;
            })
    },

    isFrequencyMet: function(frequency, lastDate, currentDate) {
        switch (frequency) {
            case FrequencyEnum.Daily:
                return !botUtils.isSameDay(lastDate, currentDate);
            case FrequencyEnum.Weekly:
                return (moment(lastDate).format('W') != moment(currentDate).format('W'));
            case FrequencyEnum.Monthly:
                return (lastDate.getUTCMonth() !== currentDate.getUTCMonth());
            case FrequencyEnum.Yearly:
                return (lastDate.getUTCFullYear() !== currentDate.getUTCFullYear());
            default:
                throw 'Unrecognized frequency type: \'' + frequency + '\'';
        }
    }
};
