module.exports = (function() {
    'use strict';

    const features = require('../phil/features');
    const prompts = require('../phil/prompts');
    const helpGroups = require('../phil/help-groups');
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
            message += (index + 1) + '. ' + queue[index].promptText + '\n';
        }

        return message;
    }

    function _sendPromptQueueToChannel(queue, bot, channelId) {
        const message = _makeMessageOutOfQueue(queue);
        bot.sendMessage({
            to: channelId,
            message: message
        });
    }

    return {
        aliases: [],

        helpGroup: helpGroups.Groups.Prompts,
        helpDescription: 'Displays the current queue of approved prompts that will show up in chat shortly.',
        versionAdded: 7,

        publicRequiresAdmin: true,
        processPublicMessage: function(bot, message, commandArgs, db) {
            return features.ensureFeatureIsEnabled(features.Features.DailyPrompts, db)
                .then(() => prompts.getPromptQueue(db, bot, MAX_QUEUE_DISPLAY_LENGTH))
                .then(queue => _sendPromptQueueToChannel(queue, bot, message.channelId));
        }
    };
})();
