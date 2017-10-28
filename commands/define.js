module.exports = (function() {
    'use strict';

    const botUtils = require('../bot_utils');
    const requestables = require('../phil/requestables');
    const helpGroups = require('../phil/help-groups');

    function _getRequestStringFromCommandArgs(commandArgs) {
        var requestString = commandArgs[0].toLowerCase();
        requestString = requestString.replace(/`/g, '');
        return requestString;
    }

    function _ensureCommandArgsValid(commandArgs) {
        if (commandArgs.length < 2) {
            return Promise.reject('`' + process.env.COMMAND_PREFIX + 'define` requires two parameters, separated by a space:\n' +
                '[1] the text to be used by users with `' + process.env.COMMAND_PREFIX + 'request` (cannot contain any spaces)\n' +
                '[2] the full name of the Discord role (as it currently is spelled)');
        }

        const requestString = _getRequestStringFromCommandArgs(commandArgs);
        if (requestString.length === 0) {
            return Promise.reject('The request string that you entered is invalid or contained only invalid characters.');
        }

        return commandArgs;
    }

    function _convertCommandArgsToData(commandArgs, server) {
        const data = {
            requestString: _getRequestStringFromCommandArgs(commandArgs)
        };

        const roleName = commandArgs.slice(1).join(' ').trim();
        for (let roleId in server.roles) {
            const role = server.roles[roleId];
            if (role.name.toLowerCase() === roleName) {
                data.roleId = role.id;
                data.roleName = role.name;
                return data;
            }
        }

        return Promise.reject('There is no role with the name of `' + roleName + '`.')
    }

    function _ensureRequestableDoesntExist(doesExist, requestString) {
        if (doesExist) {
            return Promise.reject('There is already a `' + requestString + '` request string.');
        }
    }

    function _validateInputData(data, db) {
        return requestables.doesRequestableExist(data.requestString, db)
            .then(doesExist => _ensureRequestableDoesntExist(doesExist, data.requestString))
            .then(() => data);
    }

    function _sendSuccessMessage(bot, channelId, data) {
        botUtils.sendSuccessMessage({
            bot: bot,
            channelId: channelId,
            message: '`' + data.requestString + '` has been set up for use with `' + process.env.COMMAND_PREFIX + 'request` to grant the ' + data.roleName + ' role.'
        });
    }

    return {
        publicRequiresAdmin: true,
        privateRequiresAdmin: true,
        aliases: [],
        helpGroup: helpGroups.Groups.Admin,
        helpDescription: 'Creates a new requestable role that users can use with `' + process.env.COMMAND_PREFIX + 'request`',

        processPublicMessage: function(bot, user, userId, channelId, commandArgs, db) {
            const serverId = bot.channels[channelId].guild_id;
            const server = bot.servers[serverId];

            return Promise.resolve()
                .then(() => _ensureCommandArgsValid(commandArgs))
                .then(commandArgs => _convertCommandArgsToData(commandArgs, server))
                .then(data => _validateInputData(data, db))
                .then(data => requestables.createRequestable(data, db))
                .then(data => _sendSuccessMessage(bot, channelId, data));
        }
    };
})();