module.exports = (function() {
    'use strict';

    const features = require('../phil/features');
    const prompts = require('../phil/prompts');
    const buckets = require('../phil/buckets');
    const helpGroups = require('../phil/help-groups');
    const discord = require('../promises/discord');
    const MAX_QUEUE_DISPLAY_LENGTH = 10;

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
                .then(() => buckets.retrieveFromCommandArgs(bot, db, commandArgs, message.server, 'queue'))
                .then(bucket => prompts.getPromptQueue(db, bot, bucket, MAX_QUEUE_DISPLAY_LENGTH))
                .then(_makeMessageOutOfQueue)
                .then(response => discord.sendMessage(bot, message.channelId, response));
        }
    };
})();
