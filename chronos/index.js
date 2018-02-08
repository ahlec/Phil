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
        assert(typeof(chronoDefinition.canProcess) === 'function');
        assert(chronoDefinition.canProcess.length === 4); // (bot, db, serverId, now)
        assert(typeof(chronoDefinition.process) === 'function');
        assert(chronoDefinition.process.length === 4); // (bot, db, serverId, now)
    }

    function loadChronos(filenames) {
        const chronos = {};

        for (let filename of filenames) {
            if (shouldSkipLoadingChrono(filename)) {
                continue;
            }

            let chronoDefinition = require(__dirname + '/' + filename);
            assertIsValidChrono(chronoDefinition);

            const chronoHandle = filename.slice(0, -3).toLowerCase();
            chronos[chronoHandle] = chronoDefinition;
            console.log('chrono \'%s\' registered', chronoHandle);
        }

        return chronos;
    }

    return fs.readdir(__dirname)
        .then(loadChronos);
})();
