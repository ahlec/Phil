module.exports = (function() {
    'use strict';

    const prompts = require('../phil/prompts');
    const helpGroups = require('../phil/help-groups');
    const MAX_QUEUE_DISPLAY_LENGTH = 10;

    function _ensureDailyPromptsAreEnabled(arePromptsEnabled) {
        if (arePromptsEnabled !== true) {
            return Promise.reject('Daily prompts are temporarily disabled, so we don\'t have a queue. You can use `' + process.env.COMMAND_PREFIX + 'enableprompts` to turn them back on.');
        }
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

        publicRequiresAdmin: true,
        processPublicMessage: function(bot, message, commandArgs, db) {
            return prompts.getAreDailyPromptsEnabled(db)
                .then(_ensureDailyPromptsAreEnabled)
                .then(() => prompts.getPromptQueue(db, MAX_QUEUE_DISPLAY_LENGTH))
                .then(queue => _sendPromptQueueToChannel(queue, bot, message.channelId));
        }
    };
})();