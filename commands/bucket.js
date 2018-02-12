'use strict';

const features = require('../phil/features');
const buckets = require('../phil/buckets');
const helpGroups = require('../phil/help-groups');
const discord = require('../promises/discord');

function createField(bot, bucket, header, value, valueTransformFunc) {
    if (valueTransformFunc) {
        value = valueTransformFunc(bot, bucket, value);
    }

    return {
        name: header,
        value: value,
        inline: true
    }
}

function formatBoolean(bot, bucket, value) {
    return (value ? 'Yes' : 'No');
}

function formatChannel(bot, bucket, value) {
    return '<#' + value + '>';
}

function sendBucketToChannel(bot, channelId, bucket) {
    return discord.sendEmbedMessage(bot, channelId, {
        color: 0xB0E0E6,
        title: ':writing_hand: Prompt Bucket: ' + bucket.handle,
        fields: [
            createField(bot, bucket, 'Reference Handle', bucket.handle),
            createField(bot, bucket, 'Display Name', bucket.displayName),
            createField(bot, bucket, 'Database ID', bucket.id),
            createField(bot, bucket, 'Is Valid', bucket.isValid, formatBoolean),
            createField(bot, bucket, 'Channel', bucket.channelId, formatChannel),
            createField(bot, bucket, 'Required Member Role', (bucket.requiredRoleId ? '<@' + bucket.requiredRoleId + '>' : 'None')),
            createField(bot, bucket, 'Is Paused', bucket.isPaused, formatBoolean),
            createField(bot, bucket, 'Should Pin Posts', bucket.shouldPinPosts, formatBoolean),
            createField(bot, bucket, 'Frequency', bucket.frequencyDisplayName)
        ]
    });
}

module.exports = {
    aliases: [],

    helpGroup: helpGroups.Groups.Prompts,
    helpDescription: 'Displays all of the configuration information for a prompt bucket.',
    versionAdded: 11,

    publicRequiresAdmin: true,
    processPublicMessage: function(bot, message, commandArgs, db) {
        return features.ensureFeatureIsEnabled(features.Features.Prompts, db)
            .then(() => buckets.retrieveFromCommandArgs(bot, db, commandArgs, message.server, 'bucket', true))
            .then(bucket => sendBucketToChannel(bot, message.channelId, bucket));
    }
};
