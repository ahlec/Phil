module.exports = (function() {
    'use strict';
    const commands = {};
    const fs = require('fs');

    fs.readdir(__dirname, function(err, filenames) {
        if (err) {
            console.error('FAILED TO READ THE COMMANDS DIRECTORY!');
            console.error(err);
            process.exit(1);
            return;
        }

        for (var index = 0; index < filenames.length; ++index) {
            const filename = filenames[index];
            if (filename === 'index.js' || !filename.endsWith('.js')) {
                continue;
            }

            const command = filename.slice(0, -3).toLowerCase();
            let commandImplementation = require(__dirname + '/' + filename);
            commands[command] = commandImplementation;
            console.log('command \'%s\' registered', command);
            for (var aliasIndex = 0; aliasIndex < commandImplementation.aliases.length; ++aliasIndex) {
                commands[commandImplementation.aliases[aliasIndex]] = commandImplementation;
                console.log('alias \'%s\' registered to command \'%s\'', commandImplementation.aliases[aliasIndex], command);
            }
        }
    });

    return commands;
})();