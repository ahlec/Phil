module.exports = (function() {
    'use strict';

    const fs = require('../promises/fs');
    const botUtils = require('../phil/utils');

    function shouldSkipLoadingCommand(filename) {
        if (filename === 'index.js' || !filename.endsWith('.js')) {
            return true;
        }

        return false;
    }

    function loadCommands(filenames) {
        const commands = {};

        for (let filename of filenames) {
            if (shouldSkipLoadingCommand(filename)) {
                continue;
            }

            const command = filename.slice(0, -3).toLowerCase();
            commands[command] = require(__dirname + '/' + filename);
            console.log('command \'%s\' registered', command);
        }

        return commands;
    }

    function registerAliases(commands) {
        for (let command in commands) {
            const commandImplementation = commands[command];

            for (let alias of commandImplementation.aliases) {
                commands[alias] = commandImplementation;
                console.log('alias \'%s\' registered to command \'%s\'', alias, command);
            }
        }

        return commands;
    }

    function informHelpCommand(commands) {
        if (commands['help']) {
            return commands['help'].saveCommandDefinitions(commands)
                .then(() => commands);
        }

        return commands;
    }

    return fs.readdir(__dirname)
        .then(loadCommands)
        .then(registerAliases)
        .then(informHelpCommand);
})();
