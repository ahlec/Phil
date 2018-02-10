'use strict';

const botUtils = require('../phil/utils');
const helpGroups = require('../phil/help-groups');
const discord = require('../promises/discord');
const versions = require('../phil/versions');

var _groupsPromise;

function _isAlias(command, commandImplementation) {
    return (commandImplementation.aliases.indexOf(command) >= 0);
}

function _filterDisplayableCommands(commands) {
    const displayable = {};
    for (let command in commands) {
        let commandImplementation = commands[command];

        if (_isAlias(command, commandImplementation)) {
            continue;
        }

        if (typeof(commandImplementation.helpGroup) !== 'number') {
            return Promise.reject('Command \'' + command + '\' does not have a help group.');
        }

        if (commandImplementation.helpGroup < 0) {
            continue;
        }

        displayable[command] = commandImplementation;
    }

    return displayable;
}

function _isVersionNew(versionAdded) {
    return (versionAdded >= versions.CODE - 1);
}

function _createHelpInfoArray(displayable) {
    const helpInfo = [];

    for (let command in displayable) {
        let commandImplementation = displayable[command];

        if (typeof(commandImplementation.helpDescription) !== 'string' || commandImplementation.helpDescription.length === 0) {
            return Promise.reject('command \'' + command + '\' didn\'t provide a helpDescription string');
        }

        helpInfo.push({
            name: command,
            group: commandImplementation.helpGroup,
            isAdminFunction: (commandImplementation.publicRequiresAdmin === true),
            message: commandImplementation.helpDescription,
            aliases: commandImplementation.aliases,
            isNew: _isVersionNew(commandImplementation.versionAdded)
        });
    }

    return helpInfo;
}

function _groupHelpInfo(helpInfo) {
    const groups = {};

    for (let info of helpInfo) {
        if (!groups[info.group]) {
            groups[info.group] = [];
        }

        groups[info.group].push(info);
    }

    return groups;
}

function _helpInformationSortFunction(a, b) {
    if (a.name === b.name) {
        return 0;
    }

    if (a.isAdminFunction !== b.isAdminFunction) {
        return (a.isAdminFunction ? 1 : -1); // Admin functions should always come after non-admin functions
    }

    return (a.name < b.name ? -1 : 1);
}

function _sortGroups(groups) {
    for (let groupNumber in groups) {
        groups[groupNumber].sort(_helpInformationSortFunction);
    }

    return groups;
}




function _formatHelpInformationForDisplay(helpInformation) {
    var message = (helpInformation.isAdminFunction ? ':small_orange_diamond:' : ':small_blue_diamond:');

    if (helpInformation.isNew) {
        message += ':new:'
    }

    message += ' [`' + helpInformation.name + '`';
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
    message += '] ' + helpInformation.message + '\n';
    return message;
}

function _determineIfUserIsAdmin(bot, channelId, userId) {
    const serverId = bot.channels[channelId].guild_id;
    const server = bot.servers[serverId];
    const member = server.members[userId];
    const isUserAnAdmin = botUtils.isMemberAnAdminOnServer(member, server);
    return isUserAnAdmin;
}

function _getGroupItems(group, isUserAnAdmin, isAdminChannel) {
    const items = [];

    for (let item of group) {
        let canDisplayItem = true;
        if (item.isAdminFunction) {
            canDisplayItem = (isUserAnAdmin && isAdminChannel)
        }

        if (canDisplayItem) {
            items.push(item);
        }
    }

    return items;
}

function _createHelpMessage(groups, bot, channelId, userId) {
    const isUserAnAdmin = _determineIfUserIsAdmin(bot, channelId, userId);
    const isAdminChannel = botUtils.isAdminChannel(channelId);

    const messages = [];
    var currentMessage = '';
    for (let groupNumber in groups) {
        let items = _getGroupItems(groups[groupNumber], isUserAnAdmin, isAdminChannel);
        if (items.length === 0) {
            continue;
        }

        currentMessage += '\n\n**';
        currentMessage += helpGroups.getHeaderForGroup(groupNumber);
        currentMessage += '**\n';

        for (let helpInformation of items) {
            let helpMessage = _formatHelpInformationForDisplay(helpInformation);

            if (currentMessage.length + helpMessage.length >= discord.PUBLIC_CHANNEL_CHARACTER_LIMIT) {
                messages.push(currentMessage);
                currentMessage = '';
            }

            currentMessage += helpMessage;
        }
    }

    currentMessage = currentMessage.replace(/^\s+|\s+$/g, '');
    messages.push(currentMessage);

    return messages;
}

function _sendMessages(bot, channelId, messages) {
    var currentPromise = Promise.resolve();
    for (let message of messages) {
        currentPromise = currentPromise.then(() => discord.sendMessage(bot, channelId, message));
    }

    return currentPromise;
}

module.exports = {
    aliases: [],

    helpGroup: helpGroups.Groups.General,
    helpDescription: 'Find out about all of the commands that Phil has available.',
    versionAdded: 3,

    publicRequiresAdmin: false,
    processPublicMessage: function(bot, message, commandArgs, db) {
        return _groupsPromise
            .then(groups => _createHelpMessage(groups, bot, message.channelId, message.userId))
            .then(helpMessages => _sendMessages(bot, message.channelId, helpMessages));
    },

    saveCommandDefinitions: function(commands) {
        _groupsPromise = Promise.resolve()
            .then(() => _filterDisplayableCommands(commands))
            .then(_createHelpInfoArray)
            .then(_groupHelpInfo)
            .then(_sortGroups);
        return _groupsPromise;
    }
};
