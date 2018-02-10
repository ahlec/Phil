'use strict';

const features = require('../phil/features');
const buckets = require('../phil/buckets');
const helpGroups = require('../phil/help-groups');
const discord = require('../promises/discord');

module.exports = {
    aliases: [],

    helpGroup: helpGroups.Groups.Prompts,
    helpDescription: 'Unpauses a prompt bucket that had been paused earlier from posting any new prompts.',
    versionAdded: 11,

    publicRequiresAdmin: true,
    processPublicMessage: function(bot, message, commandArgs, db) {
        return features.ensureFeatureIsEnabled(features.Features.Prompts, db)
            .then(() => buckets.retrieveFromCommandArgs(bot, db, commandArgs, message.server, 'pause', true))
            .then(bucket => buckets.setIsPaused(db, bucket, false))
            .then(bucket => discord.sendMessage(bot, message.channelId, '**' + bucket.displayName + '** (' + bucket.handle + ') has been unpaused. You can pause it once more by using `' + process.env.COMMAND_PREFIX + 'pause ' + bucket.handle + '`.'));
    }
};
