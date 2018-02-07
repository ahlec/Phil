'use strict';

const botUtils = require('../phil/utils');
const util = require('util');
const discord = require('../promises/discord');

function getChronosToEvaluate(db, utcHour) {
    return db.query(`SELECT
            sc.server_id,
            c.chrono_handle
        FROM server_chronos sc
        JOIN chronos c
            ON sc.chrono_id = c.chrono_id
        LEFT JOIN server_features sf
            ON c.required_feature_id = sf.feature_id AND sc.server_id = sf.server_id
        WHERE
            sc.is_enabled = E'1' AND
            c.utc_hour <= $1 AND
            (sf.is_enabled = E'1' OR sf.is_enabled IS NULL) AND
            (sc.date_last_ran IS NULL OR sc.date_last_ran < CURRENT_DATE)`, [utcHour])
        .then(results => {
            const instances = [];

            for (let dbRow of results.rows) {
                instances.push({
                    serverId: dbRow.server_id,
                    chronoHandle: dbRow.chrono_handle
                });
            }

            return instances;
        });
}

module.exports = class ChronoManager {
    constructor(bot, chronos, db)
    {
        this._bot = bot;
        this._chronos = chronos;
        this._db = db;
        this._channelsLastMessageTable = {};
        this._hasBeenStarted = false;
    }

    get MinimumSilenceRequiredBeforePostingInChannel() {
        return 10; // 10 minutes
    }

    start() {
        if (this._hasBeenStarted) {
            return;
        }

        this._hasBeenStarted = true;
        console.log('[CHRONOS] Starting chronos system.');
        setInterval(this._processChronos.bind(this), 1000 * 60 * 15); // Run every 15 minutes
        this._processChronos(); // Also run at startup to make sure you get anything that ran earlier that day
    }

    getMinutesSinceLastMessageInChannel(channelId, now) {
        const minutesSinceLast = this._channelsLastMessageTable[channelId];
        if (minutesSinceLast === undefined) {
            this._channelsLastMessageTable[channelId] = new Date(); // We'll set it here since we don't have a baseline but it helps us move past this section if the bot started out with the channel dead
            return 0;
        }

        const millisecondsDiff = (now - minutesSinceLast);
        if (millisecondsDiff <= 0) {
            return 0;
        }

        return Math.floor((millisecondsDiff / 1000) / 60);
    }

    recordNewMessageInChannel(channelId) {
        this._channelsLastMessageTable[channelId] = new Date();
    }

    _processChronos() {
        const now = new Date();
        const utcHour = now.getUTCHours();
        console.log('[CHRONOS] processing chronos with UTC hour = %d', utcHour);

        return getChronosToEvaluate(this._db, utcHour)
            .then(toEvaluate => {
                for (let instance of toEvaluate) {
                    this._processChronoInstance(instance);
                }
            });
    }

    _processChronoInstance(instance) {
        console.log('[CHRONOS] %s for serverId %s', instance.chronoHandle, instance.serverId);
    }

/*
        if (this._isNewDay(now)) {
            console.log('[CHRONOS] new UTC day, so resetting all chronos');
            this._resetNewDay();
        }

        var lastPromise = Promise.resolve();
        for (let chrono of this._chronos) {
            if (chrono.hasBeenTriggered) {
                continue;
            }

            if (chrono.retryInTimeout !== undefined) {
                continue;
            }

            if (chrono.definition.hourUtc > utcHour) {
                continue;
            }

            lastPromise = lastPromise.then(() => this._processChrono(now, chrono, true));
        }

        this._chronosLastProcessed = now;
    }

    _isNewDay(now) {
        if (!this._chronosLastProcessed) {
            return false;
        }

        return !botUtils.isSameDay(this._chronosLastProcessed, now);
    }

    _resetNewDay() {
        for (let chrono of this._chronos) {
            chrono.hasBeenTriggered = false;
        }
    }

    _processChrono(now, chrono, shouldPrintHeader) {
        if (shouldPrintHeader) {
            console.log('[CHRONOS] \'%s\' has met the time requirement to be processed', chrono.definition.name);
        }

        return chrono.definition.canProcess(this, now, this._bot, this._db)
            .then(results => this._interpretCanProcess(now, chrono, results))
            .then(canProceedToProcess => this._branchProcessChrono(now, chrono, canProceedToProcess))
            .catch(err => this._reportChronoError(err, chrono));
    }

    _interpretCanProcess(now, chrono, results) {
        if (results.ready) {
            return true;
        }

        if (results.retryIn === undefined) {
            console.log('[CHRONOS]     \'%s\' is not ready to be processed yet.', chrono.definition.name);
            return false;
        }

        console.log('[CHRONOS]     it\'s time to activate chrono \'%s\' but we need to defer this for %d minute(s) first.', chrono.definition.name, results.retryIn);
        const retryMilliseconds = results.retryIn * 60 * 1000; // retryIn is measured in milliseconds
        chrono.retryInTimeout = setTimeout(this._retryProcessingChrono.bind(this, chrono), retryMilliseconds);
        return false;
    }

    _retryProcessingChrono(chrono) {
        const now = new Date();
        clearTimeout(chrono.retryInTimeout);
        chrono.retryInTimeout = undefined;

        console.log('[CHRONOS] retrying chrono \'%s\' now that the time has elapsed properly.', chrono.definition.name);
        this._processChrono(now, chrono, false);
    }

    _branchProcessChrono(now, chrono, canProceedToProcess) {
        if (!canProceedToProcess) {
            return;
        }

        console.log('[CHRONOS]     processing \'%s\'', chrono.definition.name);

        return chrono.definition.process(this, now, this._bot, this._db)
            .then(result => this._handleProcessingComplete(chrono, result));
    }

    _handleProcessingComplete(chrono, result) {
        console.log('[CHRONOS]     \'%s\' finished. The result was %s', chrono.definition.name, result);
        chrono.hasBeenTriggered = true;
    }

    _reportChronoError(err, chrono) {
        console.error('[CHRONOS]     error from \'%s\'', chrono.definition.name);
        console.error(err);

        if (typeof(err) !== 'string') {
            err = util.inspect(err);
        }

        discord.sendEmbedMessage(this._bot, process.env.BOT_CONTROL_CHANNEL_ID, {
            color: 0xCD5555,
            title: ':no_entry: Chrono Error',
            description: err,
            footer: {
                text: 'chrono: ' + chrono.definition.name
            }
        });
    }
    */
};
