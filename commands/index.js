module.exports = (function() {
    'use strict';

    const fs = require('fs');
    const botUtils = require('../bot_utils');

    const commands = {};

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
                commands[alias] = commandImplementation;
                console.log('alias \'%s\' registered to command \'%s\'', alias, command);
            }
        }

        if (commands['help']) {
            commands['help'].saveCommandDefinitions(userCommands, adminCommands);
        }
    });

    return commands;
})();