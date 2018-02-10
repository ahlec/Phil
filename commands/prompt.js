'use strict';

const features = require('../phil/features');
const prompts = require('../phil/prompts');
const buckets = require('../phil/buckets');
const helpGroups = require('../phil/help-groups');

function _ensureChannelHasBucket(bucket) {
    if (bucket === null) {
        return Promise.reject('This channel is not configured to work with prompts.');
    }

    return bucket;
}

function _ensureThereIsPrompt(prompt) {
    if (prompt === null) {
        return Promise.reject('There\'s no prompt right now. That probably means that I\'m out of them! Why don\'t you suggest more by sending me `' + process.env.COMMAND_PREFIX + 'suggest` and including your prompt?');
    }

    return prompt;
}

module.exports = {
    aliases: [],

    helpGroup: helpGroups.Groups.Prompts,
    helpDescription: 'Asks Phil to remind you what the prompt of the day is.',
    versionAdded: 3,

    publicRequiresAdmin: false,
    processPublicMessage: function(bot, message, commandArgs, db) {
        return features.ensureFeatureIsEnabled(features.Features.Prompts, db)
            .then(() => buckets.getFromChannelId(bot, db, message.channelId))
            .then(_ensureChannelHasBucket)
            .then(bucket => prompts.getCurrentPrompt(bot, db, bucket))
            .then(_ensureThereIsPrompt)
            .then(prompt => prompts.sendPromptToChannel(bot, message.channelId, prompt.promptNumber, prompt));
    }
};
