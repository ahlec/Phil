'use strict';

const helpGroups = require('../phil/help-groups');
const discord = require('../promises/discord');

function getEchoedStatementFromCommandArgs(commandArgs) {
    var echoedMessage = commandArgs.join(' ').trim();
    echoedMessage = echoedMessage.replace(/`/g, '');

    if (echoedMessage.length === 0) {
        return Promise.reject('You must provide a message to this function that you would like Phil to repeat in #news. For instance, `' + process.env.COMMAND_PREFIX + 'news A New Guardian has been Chosen!`');
    }

    return echoedMessage;
}

module.exports = {
    aliases: [],

    helpGroup: helpGroups.Groups.Admin,
    helpDescription: 'Has Phil echo the message provided in the news channel.',
    versionAdded: 11,

    publicRequiresAdmin: true,
    processPublicMessage: function(bot, message, commandArgs, db) {
        return Promise.resolve()
            .then(() => getEchoedStatementFromCommandArgs(commandArgs))
            .then(echoedMessage => discord.sendMessage(bot, process.env.NEWS_CHANNEL_ID, echoedMessage));
    }
};
