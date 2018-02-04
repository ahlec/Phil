'use strict';

const discord = require('../promises/discord');

function getSuggestionFromCommandArgs(commandArgs) {
    var prompt = commandArgs.join(' ').trim();
    prompt = prompt.replace(/`/g, '');

    if (prompt.length === 0) {
        return Promise.reject('You must provide a prompt to suggest!');
    }

    return prompt;
}

function addNewPrompt(db, user, userId, prompt, suggestAnonymously) {
    var suggestBit = (suggestAnonymously ? 1 : 0);
    return db.query('INSERT INTO prompts(suggesting_user, suggesting_userid, date_suggested, prompt_text, submitted_anonymously) VALUES($1, $2, CURRENT_TIMESTAMP, $3, $4)', [user, userId, prompt, suggestBit])
        .then(() => prompt);
}

function sendConfirmationMessage(bot, channelId, prompt) {
    return discord.sendEmbedMessage(bot, channelId, {
        color: 0xB0E0E6,
        title: ':envelope_with_arrow: Submission Received',
        description: 'The following prompt has been sent to the admins for approval:\n\n**' + prompt + '**\n\nIf it\'s approved, you\'ll see it in chat shortly and you\'ll receive a point for the leaderboard!'
    });
}

module.exports = {
    suggestCommand: function(bot, message, commandArgs, db, suggestAnonymously) {
        return Promise.resolve()
            .then(() => getSuggestionFromCommandArgs(commandArgs))
            .then(prompt => addNewPrompt(db, message.user, message.userId, prompt, suggestAnonymously))
            .then(prompt => sendConfirmationMessage(bot, message.channelId, prompt));
    }
};
