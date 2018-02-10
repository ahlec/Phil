'use strict';

const botUtils = require('../phil/utils');
const helpGroups = require('../phil/help-groups');
const buckets = require('../phil/buckets');
const prompts = require('../phil/prompts');
const MAX_LIST_LENGTH = 10;

function clearPreviousConfirmListForChannel(db, channelId) {
    return db.query('DELETE FROM prompt_confirmation_queue WHERE channel_id = $1', [channelId]);
}

function addPromptToConfirmationQueue(db, channelId, listItem, index) {
    const promptId = listItem.promptId;
    return db.query('INSERT INTO prompt_confirmation_queue VALUES($1, $2, $3)', [channelId, promptId, index]);
}

function createConfirmationQueueFromList(db, channelId, list) {
    var promise = Promise.resolve();
    for (let index = 0; index < list.length; ++index) {
        promise = promise.then(() => addPromptToConfirmationQueue(db, channelId, list[index], index));
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

    for (let index = 0; index < list.length; ++index) {
        message += '\n        `' + (index + 1) + '`: "' + list[index].text + '"';
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

module.exports = {
    aliases: [],

    helpGroup: helpGroups.Groups.Prompts,
    helpDescription: 'Creates a list of some of the unconfirmed prompts that are awaiting admin approval before being added to the prompt queue.',
    versionAdded: 1,

    publicRequiresAdmin: true,
    processPublicMessage: function(bot, message, commandArgs, db) {
        return clearPreviousConfirmListForChannel(db, message.channelId)
            .then(() => buckets.retrieveFromCommandArgs(bot, db, commandArgs, message.server, 'unconfirmed'))
            .then(bucket => prompts.getUnconfirmedPrompts(bot, db, bucket, MAX_LIST_LENGTH))
            .then(list => createConfirmationQueueFromList(db, message.channelId, list))
            .then(list => outputConfirmationQueue(bot, message.channelId, list));
    }
};
