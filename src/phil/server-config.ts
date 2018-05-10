'use strict';

import { Server as DiscordIOServer, Channel as DiscordIOChannel } from 'discord.io';
import { Database } from './database';
import { QueryResult } from 'pg';
import { GlobalConfig } from './global-config';

interface IValidateResult {
    isValid : boolean;
    invalidReason : string | null;
}

export class ServerConfig {
    readonly serverId : string;
    readonly botControlChannel? : DiscordIOChannel;
    readonly commandPrefix : string;

    private constructor(public readonly server : DiscordIOServer,
        private readonly globalConfig : GlobalConfig,
        dbRow : any) {
        this.serverId = dbRow.server_id;
        this.commandPrefix = dbRow.command_prefix;

        if (dbRow.bot_control_channel_id) {
            this.botControlChannel = server.channels[dbRow.bot_control_channel_id];
        }
    }

    static async getFromId(db : Database, server : DiscordIOServer, globalConfig : GlobalConfig) : Promise<ServerConfig> {
        const results = await db.query('SELECT * FROM server_configs WHERE server_id = $1', [server.id]);
        if (results.rowCount === 0) {
            return null;
        }

        return new ServerConfig(server, globalConfig, results.rows[0]);
    }

    validateCommandPrefix(commandPrefix : string) : IValidateResult {
        if (!commandPrefix || commandPrefix.length === 0) {
            return {
                isValid: false,
                invalidReason: "A command prefix must be at least one character in length."
            };
        }

        if (commandPrefix.length > this.globalConfig.maxCommandPrefixLength) {
            return {
                isValid: false,
                invalidReason: "A command prefix cannot be longer than " + this.globalConfig.maxCommandPrefixLength + " characters."
            };
        }

        return {
            isValid: true,
            invalidReason: null
        };
    }
}
