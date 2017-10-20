module.exports = (function() {
    'use strict';

    const botUtils = require('../bot_utils');
    var _userCommands;
    var _adminCommands;

    function helpInformationSortFunction(a, b) {
        if (a.name === b.name) {
            return 0;
        }

        return (a.name < b.name ? -1 : 1);
    }

    function _determineIfUserIsAdmin(bot, channelId, userId) {
        const serverId = bot.channels[channelId].guild_id;
        const server = bot.servers[serverId];
        const member = server.members[userId];
        const isUserAnAdmin = botUtils.isMemberAnAdminOnServer(member, server);
        return isUserAnAdmin;
    }

    function _formatHelpInformationForDisplay(helpInformation, isAdminFunction) {
        const emoji = (isAdminFunction ? ':large_orange_diamond:' : ':large_blue_diamond:');
        var message = emoji + ' [`' + helpInformation.name + '`';
        if (helpInformation.aliases.length > 0) {
            message += ' (alias';
            if (helpInformation.aliases.length > 1) {
                message += 'es';
            }
            message += ': ';
            for (let index = 0; index < helpInformation.aliases.length; ++index) {
                if (index > 0) {
                    message += ', ';
                }
                message += '`' + helpInformation.aliases[index] + '`';
            }
            message += ')';
        }
        message += '] ' + helpInformation.message;
        return message;
    }

    function _createHelpMessage(isUserAnAdmin) {
        var helpMessage = 'I\'m equipped to understand the following commands if you start them with `' + process.env.COMMAND_PREFIX + '` (like `' + process.env.COMMAND_PREFIX + 'help`):\n\n';
        if (_userCommands.length > 0) {
            helpMessage += '**USER COMMANDS**\n';
            for (let command of _userCommands) {
                helpMessage += _formatHelpInformationForDisplay(command, false) + '\n';
            }
        }

        if (isUserAnAdmin && _adminCommands.length > 0) {
            helpMessage += '\n**ADMIN COMMANDS**\n';
            for (let command of _adminCommands) {
                helpMessage += _formatHelpInformationForDisplay(command, true) + '\n';
            }
        }

        helpMessage = helpMessage.replace(/^\s+|\s+$/g, '');
        return helpMessage;
    }

    function _sendMessage(bot, channelId, message) {
        bot.sendMessage({
            to: channelId,
            message: message
        });
    }

    return {
        publicRequiresAdmin: false,
        aliases: [],
        helpDescription: 'Find out about all of the commands that Phil has available.',
        
        processPublicMessage: function(bot, user, userId, channelId, commandArgs, db) {
            return Promise.resolve()
                .then(() => _determineIfUserIsAdmin(bot, channelId, userId))
                .then(isUserAnAdmin => _createHelpMessage(isUserAnAdmin))
                .then(message => _sendMessage(bot, channelId, message));
        },

        saveCommandDefinitions: function(userCommands, adminCommands) {
            userCommands.sort(helpInformationSortFunction);
            adminCommands.sort(helpInformationSortFunction);

            _userCommands = userCommands;
            _adminCommands = adminCommands;
        }
    };
})();