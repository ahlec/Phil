'use strict';

const botUtils = require('../phil/utils');
const helpGroups = require('../phil/help-groups');
const discord = require('../promises/discord');

function _getArguments(commandArgs) {
    if (commandArgs.length === 0) {
        return ['kuzco', 'poison'];
    }

    if (commandArgs.length === 1) {
        return [commandArgs[0], 'poison'];
    }

    var indexOfSecondArgument = Math.ceil(commandArgs.length / 2);
    return [
        commandArgs.slice(0, indexOfSecondArgument).join(' ').trim(),
        commandArgs.slice(indexOfSecondArgument).join(' ').trim()
    ];
}

function _createReply(kuzcosPoison) {
    return 'Oh right, the ' +
        kuzcosPoison[1] +
        '. The ' +
        kuzcosPoison[1] +
        ' for ' +
        kuzcosPoison[0] +
        '. The ' +
        kuzcosPoison[1] +
        ' chosen specially for ' +
        kuzcosPoison[0] +
        '. ' +
        kuzcosPoison[0] +
        '\'s ' +
        kuzcosPoison[1] +
        '.';
}

function _sendMessage(bot, channelId, messageId, reply) {
    return discord.deleteMessage(bot, channelId, messageId)
        .then(() => discord.sendMessage(bot, channelId, reply));
}

module.exports = {
    aliases: [ 'poison' ],

    helpGroup: helpGroups.Groups.Memes,
    helpDescription: 'Oh right, the poison.',
    versionAdded: 8,

    publicRequiresAdmin: false,
    processPublicMessage: function(bot, message, commandArgs, db) {
        return Promise.resolve()
            .then(() => _getArguments(commandArgs))
            .then(kuzcosPoison => _createReply(kuzcosPoison))
            .then(reply => _sendMessage(bot, message.channelId, message.id, reply));
    }
};
