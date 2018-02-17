module.exports = (function() {
    'use strict';

    const fs = require('../promises/fs');
    const path = require('path');

    function shouldSkipLoadingChrono(filename) {
        if (filename === 'index.js' || !filename.endsWith('.js')) {
            return true;
        }

        return false;
    }

    function loadChronos(filenames) {
        const chronos = {};

        for (let filename of filenames) {
            if (shouldSkipLoadingChrono(filename)) {
                continue;
            }

            let chronoDefinition = require(path.join(__dirname, filename));
            const chronoHandle = filename.slice(0, -3).toLowerCase();
            chronos[chronoHandle] = chronoDefinition;
            console.log('chrono \'%s\' registered', chronoHandle);
        }

        return chronos;
    }

    return fs.readdir(__dirname)
        .then(loadChronos);
})();
