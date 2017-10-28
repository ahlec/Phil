module.exports = (function() {
    'use strict';

    const botUtils = require('../bot_utils');
    const requestables = require('../phil/requestables');
    const helpGroups = require('../phil/help-groups');

    function _ensureAtLeastOneRequestable(requestables) {
        if (requestables.length === 0) {
            return Promise.reject('There are no requestable roles defined. An admin should use `' + process.env.COMMAND_PREFIX + 'define` to create some roles.');
        }

        return requestables;
    }

    function _composeRequestableListEntry(requestableInfo) {
        var entry = '- ';

        const requestStrings = requestableInfo.requestStrings;
        for (let index = 0; index < requestStrings.length; ++index) {
            if (index > 0) {
                if (index < requestStrings.length - 1) {
                    entry += ', ';
                } else {
                    entry += ' or ';
                }
            }

            entry += '`' + requestStrings[index] + '`';
        }

        entry += ' to receive the "' + requestableInfo.roleName + '" role\n';
        return entry;
    }

    function _composeAllRequestablesList(requestables) {
        const randomRequestableIndex = Math.floor(Math.random() * requestables.length);
        
        var fullMessage = ':snowflake: You must provide a valid requestable name of a role when using `' + process.env.COMMAND_PREFIX + 'request`. These are currently:\n';
        var randomRequestableString;

        for (let index = 0; index < requestables.length; ++index) {
            let requestableInfo = requestables[index];
            fullMessage += _composeRequestableListEntry(requestableInfo);

            if (randomRequestableIndex == index) {
                randomRequestableString = botUtils.getRandomArrayEntry(requestableInfo.requestStrings);
            }
        }

        fullMessage += '\nJust use one of the above requestable names, like `' + process.env.COMMAND_PREFIX + 'request ' + randomRequestableString + '`.';
        return fullMessage;
    }

    function _sendRequestablesList(fullMessage, bot, channelId) {
        bot.sendMessage({
            to: channelId,
            message: fullMessage
        });
    }

    function _ensureUserDoesntHaveRole(role, server, userId) {
        const member = server.members[userId];

        if (member.roles.indexOf(role.id) >= 0) {
            return Promise.reject('You already have the "' + role.name + '" role.');
        }

        return role;
    }

    function _giveRoleToUser(role, bot, serverId, userId) {
        return new Promise((resolve, reject) => {
            bot.addToRole({
                serverID: serverId,
                userID: userId,
                roleID: role.id
            }, (err, response) => {
                if (err) {
                    reject('There was an error with discord when attempting to grant you the specified role. `' + botUtils.toStringDiscordError(err) + '`');
                } else {
                    resolve(role);
                }
            });
        });
    }

    function _informUserOfNewRole(role, bot, userId, channelId) {
        botUtils.sendSuccessMessage({
            bot: bot,
            channelId: channelId,
            message: 'You have been granted the "' + role.name + '" role!'
        });
    }

    return {
        aliases: ['giveme'],

        helpGroup: helpGroups.Groups.Roles,
        helpDescription: 'Asks Phil to give you a role. Using the command by itself will show you all of the roles he can give you.',

        publicRequiresAdmin: false,
        processPublicMessage: function(bot, message, commandArgs, db) {
            const serverId = bot.channels[message.channelId].guild_id;
            const server = bot.servers[serverId];

            if (commandArgs.length === 0) {
                return requestables.getAllRequestables(db, server)
                    .then(_ensureAtLeastOneRequestable)
                    .then(_composeAllRequestablesList)
                    .then(fullMessage => _sendRequestablesList(fullMessage, bot, message.channelId));
            }

            return requestables.getRoleFromRequestable(commandArgs[0], db, server)
                .then(role => _ensureUserDoesntHaveRole(role, server, message.userId))
                .then(role => _giveRoleToUser(role, bot, serverId, message.userId))
                .then(role => _informUserOfNewRole(role, bot, message.userId, message.channelId));
        }
    };
})();