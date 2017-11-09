module.exports = (function() {
    'use strict';

    const botUtils = require('../phil/utils');
    const helpGroups = require('../phil/help-groups');

    function getSuggestionFromCommandArgs(commandArgs) {
        var prompt = commandArgs.join(' ').trim();
        prompt = prompt.replace(/`/g, '');

        if (prompt.length === 0) {
            return Promise.reject('You must provide a prompt to suggest!');
        }

        return prompt;
    }

    function clearOutPreviouslyUnconfirmedPrompts(db, userId, prompt) {
        return db.query('DELETE FROM hijack_prompts WHERE suggesting_userid = $1 AND approved_by_user = E\'0\'', [userId])
            .then(() => prompt);
    }

    function addNewPrompt(db, user, userId, prompt) {
        return db.query('INSERT INTO hijack_prompts(suggesting_user, suggesting_userid, date_suggested, prompt_text) VALUES($1, $2, CURRENT_TIMESTAMP, $3)', [user, userId, prompt])
            .then(() => prompt);
    }

    function sendConfirmationMessage(bot, channelId, prompt) {
        bot.sendMessage({
            to: channelId,
            message: ':diamond_shape_with_a_dot_inside: You\'ve suggested the prompt "**' + prompt + '**".\n' +
                '* If you\'re satisfied with this, please say `' + process.env.COMMAND_PREFIX + 'confirm`.\n' +
                '* If you want to change it or cancel it, use `' + process.env.COMMAND_PREFIX + 'suggest` again to cancel this, or do nothing.'
        });
    }

    return {
        aliases: [],

        helpGroup: helpGroups.Groups.Prompts,
        helpDescription: 'Suggests a new daily prompt for Phil to add to his list. (*DIRECT MESSAGE ONLY*)',
        versionAdded: 1,

        privateRequiresAdmin: false,
        processPrivateMessage: function(bot, message, commandArgs, db) {
            return Promise.resolve()
                .then(() => getSuggestionFromCommandArgs(commandArgs))
                .then(prompt => clearOutPreviouslyUnconfirmedPrompts(db, message.userId, prompt))
                .then(prompt => addNewPrompt(db, message.user, message.userId, prompt))
                .then(prompt => sendConfirmationMessage(bot, message.channelId, prompt));
        }
    };
})();
