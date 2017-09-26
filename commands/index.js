module.exports = (function() {
    'use strict';
    const commands = {};
    const fs = require('fs');
    const assert = require('assert');
    const botUtils = require('../bot_utils.js');

    function helpInformationSortFunction(a, b) {
        if (a.name === b.name) {
            return 0;
        }

        return (a.name < b.name ? -1 : 1);
    }

    function formatHelpInformationForDisplay(helpInformation, isAdminFunction) {
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

    fs.readdir(__dirname, function(err, filenames) {
        if (err) {
            console.error('FAILED TO READ THE COMMANDS DIRECTORY!');
            console.error(err);
            process.exit(1);
            return;
        }

        const userCommands = [];
        const adminCommands = [];

        for (var index = 0; index < filenames.length; ++index) {
            const filename = filenames[index];
            if (filename === 'index.js' || !filename.endsWith('.js')) {
                continue;
            }
            assert(filename !== 'help.js');

            const command = filename.slice(0, -3).toLowerCase();
            let commandImplementation = require(__dirname + '/' + filename);
            commands[command] = commandImplementation;
            console.log('command \'%s\' registered', command);

            if (commandImplementation.hideFromHelpListing !== true) {
                const helpInformation = {
                    name: command,
                    message: commandImplementation.helpDescription,
                    aliases: commandImplementation.aliases
                };

                if (commandImplementation.publicRequiresAdmin === true || commandImplementation.privateRequiresAdmin === true) {
                    adminCommands.push(helpInformation);
                } else {
                    userCommands.push(helpInformation);
                }
            }

            for (var aliasIndex = 0; aliasIndex < commandImplementation.aliases.length; ++aliasIndex) {
                const alias = commandImplementation.aliases[aliasIndex].toLowerCase();
                assert(alias !== 'help');
                commands[alias] = commandImplementation;
                console.log('alias \'%s\' registered to command \'%s\'', alias, command);
            }
        }

        userCommands.push({
            name: 'help',
            message: 'Find out about all of the commands that Phil has available.',
            aliases: []
        });

        userCommands.sort(helpInformationSortFunction);
        adminCommands.sort(helpInformationSortFunction);

        commands['help'] = {
            publicRequiresAdmin: false,
            privateRequiresAdmin: false,
            processPublicMessage: function(bot, user, userId, channelId, commandArgs, db) {
                const serverId = bot.channels[channelId].guild_id;
                const server = bot.servers[serverId];
                const member = server.members[userId];
                const isUserAnAdmin = botUtils.isMemberAnAdminOnServer(member, server);
                
                var helpMessage = 'I\'m equipped to understand the following commands if you start them with `' + process.env.COMMAND_PREFIX + '` (like `' + process.env.COMMAND_PREFIX + 'help`):\n\n';
                if (userCommands.length > 0) {
                    helpMessage += '**USER COMMANDS**\n';
                    for (let index = 0; index < userCommands.length; ++index) {
                        helpMessage += formatHelpInformationForDisplay(userCommands[index], false) + '\n';
                    }
                }

                if (isUserAnAdmin && adminCommands.length > 0) {
                    helpMessage += '\n**ADMIN COMMANDS**\n';
                    for (let index = 0; index < adminCommands.length; ++index) {
                        helpMessage += formatHelpInformationForDisplay(adminCommands[index], true) + '\n';
                    }
                }

                helpMessage = helpMessage.replace(/^\s+|\s+$/g, '');

                bot.sendMessage({
                    to: channelId,
                    message: helpMessage
                });
            }
        };
        console.log('command \'help\' has been created dynamically from other commands');
    });

    return commands;
})();