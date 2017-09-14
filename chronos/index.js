module.exports = (function() {
    'use strict';

    const fs = require('fs');
    const assert = require('assert');
    const botUtils = require('../bot_utils.js');

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

    
    function errorMessage(message) {
        console.error('[CHRONOS] %s', message);
        botUtils.sendErrorMessage({
            bot: _bot,
            channelId: process.env.ADMIN_CHANNEL_ID,
            message: '[CHRONOS] ' + message
        });
    }

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

    function processDefinition(now, chronoDefinition, index) {
        console.log('[CHRONOS] chrono \'%s\' is ready to be processed (if it can be)', chronoDefinition.name);
        chronoDefinition.canProcess(_publicApi, now, _bot, _db)
            .then(canProcess => {
                if (!canProcess.ready) {
                    if (canProcess.retryIn !== undefined) {
                        console.log('[CHRONOS] chrono \'%s\' isn\'t ready yet. trying against in %d minute(s)', chronoDefinition.name, canProcess.retryIn);
                        chronos[index].retryInTimeout = setTimeout(function() {
                            processDefinition(new Date(), chronoDefinition, index);
                        }, canProcess.retryIn * 60 * 1000); // retryIn is measured in minutes
                    } else {
                        console.log('[CHRONOS] chrono \'%s\' was not ready to process yet', chronoDefinition.name);
                        chronos[index].retryInTimeout = undefined;
                    }
                    return;
                }

                console.log('[CHRONOS] chrono \'%s\' can be processed! it will now be processed.', chronoDefinition.name);
                chronoDefinition.process(_publicApi, now, _bot, _db)
                    .then(result => {
                        if (result) {
                            chronos[index].hasBeenTriggered = true;
                        }
                    })
                    .catch(err => {
                        errorMessage('Error processing the chrono \'' + chronoDefinition.name + '\'. `' + err + '`');
                    });
            })
            .catch(err => {
                errorMessage('Error running canProcess chrono for \'' + chronoDefinition.name + '\'. `' + err + '`');
            });
    }

    function processChronos() {
        const now = new Date();
        const utcHour = now.getUTCHours();
        console.log('[CHRONOS] processing chronos with UTC hour = %d', utcHour);

        for (let index = 0; index < chronos.length; ++index) {
            if (chronos[index].hasBeenTriggered) {
                continue;
            }

            if (chronos[index].retryInTimeout !== undefined) {
                continue;
            }

            const chronoDefinition = chronos[index].chronoDefinition;
            if (chronoDefinition.hourUtc > utcHour) {
                continue;
            }

            processDefinition(now, chronoDefinition, index);
        }
    }

    _publicApi = {
        MinimumSilenceRequiredBeforePostingInChannel: 10, // 10 minutes

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

        getMinutesSinceLastMessageInChannel: function(channelId, now) {
            if (channelsLastMessageTable[channelId] === undefined) {
                channelsLastMessageTable[channelId] = new Date(); // We'll set it here since we don't have a baseline but it helps us move past this section if the bot started out with the channel dead
                return 0;
            }

            const millisecondsDiff = (now - channelsLastMessageTable[channelId]);
            if (millisecondsDiff <= 0) {
                return 0;
            }

            return Math.floor((millisecondsDiff / 1000) / 60);
        },

        sendErrorMessage: function(message) {
            errorMessage(message);
        }
    };

    return _publicApi;
})();