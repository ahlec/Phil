module.exports = (function() {
    'use strict';

    const botUtils = require('../bot_utils');
    const requestables = require('../phil/requestables');
    const helpGroups = require('../phil/help-groups');

    function _filterOnlyRequestablesUserHas(requestables, server, userId) {
        const member = server.members[userId];
        const requestablesUserHas = [];

        for (let requestable of requestables) {
            if (member.roles.indexOf(requestable.roleId) >= 0) {
                requestablesUserHas.push(requestable);
            }
        }

        return requestablesUserHas;
    }

    function _ensureAtLeastOneRequestable(requestables) {
        if (requestables.length === 0) {
            return Promise.reject('I haven\'t given you any requestable roles yet. You use `' + process.env.COMMAND_PREFIX + 'request` in order to obtain these roles.');
        }

        return requestables;
    }

    function _composeRemovableRequestableListEntry(requestableInfo) {
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

        entry += ' to remove the "' + requestableInfo.roleName + '" role\n';
        return entry;
    }

    function _composeRemovableRequestablesList(requestables) {
        const randomRequestableIndex = Math.floor(Math.random() * requestables.length);
        
        var fullMessage = ':snowflake: These are the roles you can remove using `' + process.env.COMMAND_PREFIX + 'remove`:\n';
        var randomRequestableString;

        for (let index = 0; index < requestables.length; ++index) {
            let requestableInfo = requestables[index];
            fullMessage += _composeRemovableRequestableListEntry(requestableInfo);

            if (randomRequestableIndex == index) {
                randomRequestableString = botUtils.getRandomArrayEntry(requestableInfo.requestStrings);
            }
        }

        fullMessage += '\nJust use one of the above requestable names, like `' + process.env.COMMAND_PREFIX + 'remove ' + randomRequestableString + '`.';
        return fullMessage;
    }

    function _sendRequestablesList(fullMessage, bot, channelId) {
        bot.sendMessage({
            to: channelId,
            message: fullMessage
        });
    }

    function _ensureUserHasRole(role, server, userId) {
        const member = server.members[userId];

        if (member.roles.indexOf(role.id) < 0) {
            return Promise.reject('I haven\'t given you the "' + role.name + '" role.');
        }

        return role;
    }

    function _takeRoleFromUser(role, bot, serverId, userId) {
        return new Promise((resolve, reject) => {
            bot.removeFromRole({
                serverID: serverId,
                userID: userId,
                roleID: role.id
            }, (err, response) => {
                if (err) {
                    reject('There was an error with discord when attempting to take away the specified role. `' + botUtils.toStringDiscordError(err) + '`');
                } else {
                    resolve(role);
                }
            });
        });
    }

    function _informUserOfRemoval(role, bot, userId, channelId) {
        botUtils.sendSuccessMessage({
            bot: bot,
            channelId: channelId,
            message: 'I\'ve removed the "' + role.name + '" role from you.'
        });
    }

    return {
        aliases: [],

        helpGroup: helpGroups.Groups.Roles,
        helpDescription: 'Asks Phil to take away a requestable role that he has given you.',
        versionAdded: 7,

        publicRequiresAdmin: false,
        processPublicMessage: function(bot, message, commandArgs, db) {
            const serverId = bot.channels[message.channelId].guild_id;
            const server = bot.servers[serverId];

            if (commandArgs.length === 0) {
                return requestables.getAllRequestables(db, server)
                    .then(requestables => _filterOnlyRequestablesUserHas(requestables, server, message.userId))
                    .then(_ensureAtLeastOneRequestable)
                    .then(_composeRemovableRequestablesList)
                    .then(fullMessage => _sendRequestablesList(fullMessage, bot, message.channelId));
            }

            return requestables.getRoleFromRequestable(commandArgs[0], db, server)
                .then(role => _ensureUserHasRole(role, server, message.userId))
                .then(role => _takeRoleFromUser(role, bot, serverId, message.userId))
                .then(role => _informUserOfRemoval(role, bot, message.userId, message.channelId));
        }
    };
})();