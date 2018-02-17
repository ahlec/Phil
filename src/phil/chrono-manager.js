'use strict';

const util = require('util');
const discord = require('../promises/discord');

module.exports = class ChronoManager {
    constructor(bot, chronos, db) {
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
        const utcDate = now.getUTCFullYear() + '-' + (now.getUTCMonth() + 1) + '-' + now.getUTCDate();
        console.log('[CHRONOS] processing chronos with UTC hour = %d on UTC %s', utcHour, utcDate);

        this._db.query(`SELECT
                sc.server_id,
                c.chrono_id,
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
                (sc.date_last_ran IS NULL OR sc.date_last_ran < $2)
            ORDER BY
                c.utc_hour ASC`, [utcHour, utcDate])
            .then(results => {
                for (let dbRow of results.rows) {
                    this._processChronoInstance(now, dbRow.chrono_handle, dbRow.chrono_id, dbRow.server_id, utcDate);
                }
            });
    }

    _processChronoInstance(now, chronoHandle, chronoId, serverId, utcDate) {
        console.log('[CHRONOS] %s for serverId %s', chronoHandle, serverId);

        if (!this._bot.servers[serverId]) {
            console.log('[CHRONOS] Phil is no longer part of server with serverId %s', serverId);
            return;
        }

        const chronoDefinition = this._chronos[chronoHandle];
        if (!chronoDefinition) {
            console.error('[CHRONOS]     there is no chrono with the handle %s', chronoHandle);
            return;
        }

        return chronoDefinition(this._bot, this._db, serverId, now)
            .catch(err => this._reportChronoError(err, chronoHandle, serverId))
            .then(() => this._markChronoProcessed(chronoId, serverId, utcDate));
    }

    _markChronoProcessed(chronoId, serverId, utcDate) {
        return this._db.query(`UPDATE server_chronos
            SET date_last_ran = $1
            WHERE server_id = $2 AND chrono_id = $3`, [utcDate, serverId, chronoId]);
    }

    _reportChronoError(err, chronoHandle, serverId) {
        console.error('[CHRONOS]     error running %s for server %s', chronoHandle, serverId);
        console.error(err);

        if (typeof(err) !== 'string') {
            err = util.inspect(err);
        }

        return discord.sendEmbedMessage(this._bot, process.env.BOT_CONTROL_CHANNEL_ID, {
            color: 0xCD5555,
            title: ':no_entry: Chrono Error',
            description: err,
            footer: {
                text: 'chrono: ' + chronoHandle
            }
        });
    }
};
