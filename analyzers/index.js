module.exports = (function() {
    'use strict';

    const fs = require('../promises/fs');
    const ANALYZERS_DIRECTORY = __dirname;

    function loadAnalyzer(filename) {
        return require(ANALYZERS_DIRECTORY + '/' + filename);
    }

    function shouldSkipLoadingFile(filename) {
        if (filename === 'index.js' || !filename.endsWith('.js')) {
            return true;
        }

        return false;
    }

    function loadAnalyzers(filenames) {
        const analyzers = [];

        for (let filename of filenames) {
            if (shouldSkipLoadingFile(filename)) {
                continue;
            }

            let analyzer = loadAnalyzer(filename);
            analyzers.push(analyzer);
        }

        return analyzers;
    }

    return fs.readdir(ANALYZERS_DIRECTORY)
        .then(filenames => loadAnalyzers(filenames));
})();