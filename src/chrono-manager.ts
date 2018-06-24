const util = require('util');

import { QueryResult } from 'pg';
import IChrono from '../chronos/@types';
import ChronoLookup from '../chronos/index';
import { DiscordPromises } from '../promises/discord';
import Phil from './phil';
import ServerConfig from './server-config';
import ServerDirectory from './server-directory';

export default class ChronoManager {
    private readonly channelsLastMessageTable: { [channelId: string]: Date };
    private hasBeenStarted: boolean;

    constructor(private readonly phil: Phil, private readonly serverDirectory: ServerDirectory) {
        this.channelsLastMessageTable = {};
        this.hasBeenStarted = false;
    }

    get MinimumSilenceRequiredBeforePostingInChannel() {
        return 10; // 10 minutes
    }

    public start() {
        if (this.hasBeenStarted) {
            return;
        }

        this.hasBeenStarted = true;
        console.log('[CHRONOS] Starting chronos system.');
        setInterval(this.processChronos.bind(this), 1000 * 60 * 15); // Run every 15 minutes
        this.processChronos(); // Also run at startup to make sure you get anything that ran earlier that day
    }

    public getMinutesSinceLastMessageInChannel(channelId: string, now: Date) {
        const minutesSinceLast = this.channelsLastMessageTable[channelId];
        if (!minutesSinceLast) {
            this.channelsLastMessageTable[channelId] = new Date(); // We'll set it here since we don't have a baseline but it helps us move past this section if the bot started out with the channel dead
            return 0;
        }

        const millisecondsDiff = (Number(now) - Number(minutesSinceLast));
        if (millisecondsDiff <= 0) {
            return 0;
        }

        return Math.floor((millisecondsDiff / 1000) / 60);
    }

    public recordNewMessageInChannel(channelId: string) {
        this.channelsLastMessageTable[channelId] = new Date();
    }

    private processChronos() {
        const now = new Date();
        const utcHour = now.getUTCHours();
        const utcDate = now.getUTCFullYear() + '-' + (now.getUTCMonth() + 1) + '-' + now.getUTCDate();
        console.log('[CHRONOS] processing chronos with UTC hour = %d on UTC %s', utcHour, utcDate);

        this.phil.db.query(`SELECT
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
            .then((results: QueryResult) => {
                for (const dbRow of results.rows) {
                    this.processChronoInstance(now, dbRow.chrono_handle, dbRow.chrono_id, dbRow.server_id, utcDate);
                }
            });
    }

    private async processChronoInstance(now: Date, chronoHandle: string, chronoId: number, serverId: string, utcDate: string) {
        console.log('[CHRONOS] %s for serverId %s', chronoHandle, serverId);

        const server = this.phil.bot.servers[serverId];
        const serverConfig = await this.serverDirectory.getServerConfig(server);
        if (!serverConfig) {
            console.log('[CHRONOS] Phil is no longer part of server with serverId %s', serverId);
            return;
        }

        const chronoDefinition = ChronoLookup[chronoHandle];
        if (!chronoDefinition) {
            console.error('[CHRONOS]     there is no chrono with the handle %s', chronoHandle);
            return;
        }

        try {
            await chronoDefinition.process(this.phil, serverConfig, now);
            this.markChronoProcessed(chronoId, serverId, utcDate);
        } catch(err) {
            this.reportChronoError(err, serverConfig, chronoHandle);
        }
    }

    private markChronoProcessed(chronoId: number, serverId: string, utcDate: string) {
        return this.phil.db.query(`UPDATE server_chronos
            SET date_last_ran = $1
            WHERE server_id = $2 AND chrono_id = $3`, [utcDate, serverId, chronoId]);
    }

    private reportChronoError(err: Error | string, serverConfig: ServerConfig, chronoHandle: string) {
        console.error('[CHRONOS]     error running %s for server %s', chronoHandle, serverConfig.server.id);
        console.error(err);

        if (typeof(err) !== 'string') {
            err = util.inspect(err);
        }

        return DiscordPromises.sendEmbedMessage(this.phil.bot, serverConfig.botControlChannel.id, {
            color: 0xCD5555,
            description: err,
            footer: {
                text: 'chrono: ' + chronoHandle
            },
            title: ':no_entry: Chrono Error'
        });
    }
};
