module.exports = (function() {
    'use strict';

    const fs = require('fs');
    const assert = require('assert');

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

    const chronos = [];
    const channelsLastMessageTable = {};
    var _hasBeenStarted = false;
    var _bot;
    var _db;
    var _chronosLoadedPromise;
    var _publicApi;

    _chronosLoadedPromise = new Promise((resolve, reject) => {
        fs.readdir(__dirname, function(err, filenames) {
            if (err) {
                reject(err);
                console.error('[CHRONOS] FAILED TO READ THE CHRONOS DIRECTORY!');
                console.error(err);
                process.exit(1);
                return;
            }

            for (let index = 0; index < filenames.length; ++index) {
                const filename = filenames[index];
                if (filename === 'index.js' || !filename.endsWith('.js')) {
                    continue;
                }

                let chronoDefinition = require(__dirname + '/' + filename);
                assertIsValidChrono(chronoDefinition);
                chronos.push({
                    chronoDefinition: chronoDefinition,
                    hasBeenTriggered: false
                });
                console.log('[CHRONOS] chrono \'%s\' registered', chronoDefinition.name);
            }
            console.log('[CHRONOS] total number chronos logged: %d', chronos.length);
            resolve(chronos);
        });
    });

    function processChronos() {
        const now = new Date();
        const utcHour = now.getUTCHours();
        console.log('[CHRONOS] processing chronos with UTC hour = %d', utcHour);

        for (let index = 0; index < chronos.length; ++index) {
            if (chronos[index].hasBeenTriggered) {
                continue;
            }

            const chronoDefinition = chronos[index].chronoDefinition;
            if (chronoDefinition.hourUtc > utcHour) {
                continue;
            }

            console.log('[CHRONOS] chronos \'%s\' is ready to be processed (if it can be)', chronoDefinition.name);
            if (chronoDefinition.canProcess(_publicApi, now, _bot, _db)) {
                console.log('[CHRONOS] chronos \'%s\' can be processed! it will now be processed.', chronoDefinition.name);
                chronoDefinition.process(_publicApi, now, _bot, _db);
                chronos[index].hasBeenTriggered = true;
            }
        }
    }

    _publicApi = {
        start: function(bot, db) {
            if (_hasBeenStarted) {
                console.error('[CHRONOS] The chronos manager has already been started.');
                process.exit(1);
                return;
            }

            _hasBeenStarted = true;
            _bot = bot;
            _db = db;

            console.log('[CHRONOS] Going to start chronos manager as soon as the filesystem promise is resolved.');
            _chronosLoadedPromise.then(function() {
                console.log('[CHRONOS] Filesystem promise is resolved. Starting.');
                setInterval(processChronos, 1000 * 60 * 15); // Run every 15 minutes
                processChronos(); // Also run at startup to make sure you get anything that ran earlier that day
            });
        },

        recordNewMessageInChannel: function(channelId) {
            channelsLastMessageTable[channelId] = new Date();
        },

        getMinutesSinceLastMessageInChannel: function(channelId) {
            if (channelsLastMessageTable[channelId] === undefined) {
                return 0; // I guess??
            }

            const now = new Date();
            const millisecondsDiff = (now - channelsLastMessageTable[channelId]);
            if (millisecondsDiff <= 0) {
                return 0;
            }

            return Math.floor((millisecondsDiff / 1000) / 60);
        },
    };

    return _publicApi;
})();