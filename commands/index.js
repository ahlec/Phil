module.exports = (function() {
	'use strict';
	const commands = {};
	const fs = require('fs');

    fs.readdir(__dirname, function(err, filenames) {
        if (err) {
	        console.error('FAILED TO READ THE COMMANDS DIRECTORY!');
            console.error(err);
            return;
        }

        for (var index = 0; index < filenames.length; ++index) {
	        const filename = filenames[index];
            if (filename === 'index.js' || !filename.endsWith('.js')) {
	            continue;
            }
	        const command = filename.slice(0, -3).toLowerCase();
	        commands[command] = require(__dirname + '/' + filename);
            console.log('command \'%s\' registered', command);
        }
    });

	return commands;
})();