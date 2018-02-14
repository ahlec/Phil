'use strict';

const botUtils = require('../phil/utils');
const prompts = require('../phil/prompts');
const helpGroups = require('../phil/help-groups');
const buckets = require('../phil/buckets')

// --------------------------------- Public message functionality

function confirmPrompt(bot, db, promptId, bucket) {
    return db.query('UPDATE prompts SET approved_by_admin = E\'1\' WHERE prompt_id = $1', [promptId])
        .then(() => {
/*            if (bucket.frequency == buckets.Frequency.Immediately) {
                return prompts.sendPromptToChannel(bot, bucket.channelId, bucket,)
            }*/
        });
}

function confirmPromptCallback(bot, db, promptId) {
    return db.query('SELECT bucket_id FROM prompts WHERE prompt_id = $1', [promptId])
        .then(results => {
            if (!results || results.rowCount === 0) {
                return;
            }

            return buckets.getFromId(bot, db, results.rows[0].bucket_id)
                .then(bucket => confirmPrompt(bot, db, promptId, bucket));
        });
}

function sendCompletionMessage(bot, channelId, numConfirmed) {
    if (numConfirmed === 0) {
        botUtils.sendErrorMessage({
            bot: bot,
            channelId: channelId,
            message: 'No prompts were confirmed. This is probably because they were already confirmed. You can start over by using `' + process.env.COMMAND_PREFIX + 'unconfirmed` to see all of the still-unconfirmed prompts.'
        });
        return;
    }

    botUtils.sendSuccessMessage({
        bot: bot,
        channelId: channelId,
        message: (numConfirmed === 1 ? 'Prompt was' : 'Prompts were') + ' confirmed. You may continue using `' + process.env.COMMAND_PREFIX + 'confirm` or start over by using `' + process.env.COMMAND_PREFIX + 'unconfirmed`.'
    });
}

module.exports = {
    aliases: [],

    helpGroup: helpGroups.Groups.None,
    versionAdded: 1,

    publicRequiresAdmin: true,
    processPublicMessage: function(bot, message, commandArgs, db) {
        return prompts.getConfirmRejectNumbersFromCommandArgs(commandArgs)
            .then(numbers => prompts.confirmRejectNumbers(bot, db, message.channelId, numbers, confirmPromptCallback))
            .then(numConfirmed => sendCompletionMessage(bot, message.channelId, numConfirmed));
    }
};
