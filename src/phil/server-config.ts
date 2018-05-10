'use strict';

import { Server as DiscordIOServer, Channel as DiscordIOChannel } from 'discord.io';
import { Database } from './database';
import { QueryResult } from 'pg';

export class ServerConfig {
    readonly serverId : string;
    readonly botControlChannel? : DiscordIOChannel;
    readonly commandPrefix : string;

    private constructor(public readonly server : DiscordIOServer, dbRow : any) {
        this.serverId = dbRow.server_id;
        this.commandPrefix = dbRow.command_prefix;

        if (dbRow.bot_control_channel_id) {
            this.botControlChannel = server.channels[dbRow.bot_control_channel_id];
        }
    }

    static async getFromId(db : Database, server : DiscordIOServer) : Promise<ServerConfig> {
        const results = await db.query('SELECT * FROM server_configs WHERE server_id = $1', [server.id]);
        if (results.rowCount === 0) {
            return null;
        }

        return new ServerConfig(server, results.rows[0]);
    }
}
