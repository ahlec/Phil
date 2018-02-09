'use strict';

const features = require('../phil/features');
const buckets = require('../phil/buckets');
const helpGroups = require('../phil/help-groups');
const discord = require('../promises/discord');

module.exports = {
    aliases: [],

    helpGroup: helpGroups.Groups.Prompts,
    helpDescription: 'Pauses a prompt bucket from posting any new prompts.',
    versionAdded: 11,

    publicRequiresAdmin: true,
    processPublicMessage: function(bot, message, commandArgs, db) {
        return features.ensureFeatureIsEnabled(features.Features.DailyPrompts, db)
            .then(() => buckets.retrieveFromCommandArgs(bot, db, commandArgs, message.server, 'pause', true))
            .then(bucket => buckets.setIsPaused(db, bucket, true))
            .then(bucket => discord.sendMessage(bot, message.channelId, '**' + bucket.displayName + '** (' + bucket.handle + ') has been paused. You can resume it by using `' + process.env.COMMAND_PREFIX + 'unpause ' + bucket.handle + '`.'));
    }
};
