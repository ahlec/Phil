module.exports = (function() {
    'use strict';

    const fs = require('../promises/fs');
    const assert = require('assert');

    function shouldSkipLoadingChrono(filename) {
        if (filename === 'index.js' || !filename.endsWith('.js')) {
            return true;
        }

        return false;
    }

    function assertIsValidChrono(chronoDefinition) {
        assert(typeof(chronoDefinition) === 'object');
        assert(typeof(chronoDefinition.name) === 'string');
        assert(chronoDefinition.name.length > 0);
        assert(typeof(chronoDefinition.hourUtc) === 'number');
        assert(chronoDefinition.hourUtc >= 0 && chronoDefinition.hourUtc <= 23);
        assert(typeof(chronoDefinition.canProcess) === 'function');
        assert(chronoDefinition.canProcess.length === 4); // ( chronosManager (this), now, bot, db )
        assert(typeof(chronoDefinition.process) === 'function');
        assert(chronoDefinition.process.length === 4); // ( chronosManager (this), now, bot, db )
    }

    function loadChronos(filenames) {
        const chronos = [];
        for (let filename of filenames) {
            if (shouldSkipLoadingChrono(filename)) {
                continue;
            }

            let chronoDefinition = require(__dirname + '/' + filename);
            assertIsValidChrono(chronoDefinition);

            chronos.push({
                definition: chronoDefinition,
                hasBeenTriggered: false
            });

            console.log('chrono \'%s\' registered', chronoDefinition.name);
        }

        return chronos;
    }

    return fs.readdir(__dirname)
        .then(loadChronos);
})();