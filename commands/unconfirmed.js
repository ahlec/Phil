module.exports = (function() {
    'use strict';

    const botUtils = require('../phil/utils');
    const helpGroups = require('../phil/help-groups');
    const MAX_LIST_LENGTH = 10;

    function clearPreviousConfirmListForChannel(db, channelId) {
        return db.query('DELETE FROM prompt_confirmation_queue WHERE channel_id = $1', [channelId]);
    }

    function parseUnconfirmedPromptsIntoList(results) {
        var list = [];
        for (let index = 0; index < results.rowCount; ++index) {
            list.push({
                index: index,
                promptId: results.rows[index].prompt_id,
                user: results.rows[index].suggesting_user,
                prompt: results.rows[index].prompt_text
            });
        }
        return list;
    }

    function getUnconfirmedPrompts(db) {
        return db.query('SELECT prompt_id, suggesting_user, prompt_text FROM hijack_prompts WHERE approved_by_user = E\'1\' AND approved_by_admin = E\'0\' ORDER BY date_suggested ASC LIMIT $1', [MAX_LIST_LENGTH])
            .then(results => parseUnconfirmedPromptsIntoList(results));
    }

    function addPromptToConfirmationQueue(db, channelId, listItem) {
        const promptId = listItem.promptId;
        const index = listItem.index;
        return db.query('INSERT INTO prompt_confirmation_queue VALUES($1, $2, $3)', [channelId, promptId, index]);
    }

    function createConfirmationQueueFromList(db, channelId, list) {
        var promise = Promise.resolve();
        for (let listItem of list) {
            promise = promise.then(() => addPromptToConfirmationQueue(db, channelId, listItem));
        }

        return promise.then(() => list);
    }

    function outputNoUnconfirmedPrompts(bot, channelId) {
        bot.sendMessage({
            to: channelId,
            message: ':large_blue_diamond: There are no unconfirmed prompts in the queue right now.'
        });
    }


    function outputList(bot, channelId, list) {
        const existenceVerb = (list.length === 1 ? 'is' : 'are');
        const noun = (list.length === 1 ? 'prompt' : 'prompts');
        var message = ':pencil: Here ' + existenceVerb + ' ' + list.length + ' unconfirmed ' + noun + '.';

        for (let listItem of list) {
            message += '\n        `' + (listItem.index + 1) + '`: "' + listItem.prompt + '"';
        }

        message += '\nConfirm prompts with `' + process.env.COMMAND_PREFIX + 'confirm`. You can specify a single prompt by using its number (`';
        message += process.env.COMMAND_PREFIX + 'confirm 3`) or a range of prompts using a hyphen (`' + process.env.COMMAND_PREFIX + 'confirm 2-7`)';

        bot.sendMessage({
            to: channelId,
            message: message
        });
    }

    function outputConfirmationQueue(bot, channelId, list) {
        if (list.length === 0) {
            outputNoUnconfirmedPrompts(bot, channelId);
        } else {
            outputList(bot, channelId, list);
        }
    }

    return {
        aliases: [],

        helpGroup: helpGroups.Groups.Prompts,
        helpDescription: 'Creates a list of some of the unconfirmed prompts that are awaiting admin approval before being added to the prompt queue.',
        versionAdded: 1,

        publicRequiresAdmin: true,
        processPublicMessage: function(bot, message, commandArgs, db) {
            return clearPreviousConfirmListForChannel(db, message.channelId)
                .then(() => getUnconfirmedPrompts(db))
                .then(list => createConfirmationQueueFromList(db, message.channelId, list))
                .then(list => outputConfirmationQueue(bot, message.channelId, list));
        }
    };
})();
