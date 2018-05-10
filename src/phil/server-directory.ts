
import { Database } from './database';
import { Client as DiscordIOClient, Server as DiscordIOServer } from 'discord.io';
import { ServerConfig } from './server-config';

interface IConfigCache {
    [serverId : string] : ServerConfig;
}

export class ServerDirectory {
    private readonly _bot : DiscordIOClient;
    private readonly _db : Database;
    private readonly _configCache : IConfigCache = {};

    constructor(bot : DiscordIOClient, db : Database) {
        this._bot = bot;
        this._db = db;
    }

    async getFromChannelId(channelId : string) : Promise<ServerConfig> {
        if (!this._bot.channels[channelId]) {
            throw new Error('Attempted to retrieve server config from unrecognized channel');
        }

        const serverId = this._bot.channels[channelId].guild_id;
        const server = this._bot.servers[serverId];
        if (!server) {
            throw new Error('Could not find the server corresponding to this channel.'); // TODO: DIRECT MESSAGES WILL FAIL HERE.
        }

        return await this.getServerConfig(server);
    }

    async getServerConfig(server : DiscordIOServer) : Promise<ServerConfig> {
        if (!server) {
            throw new Error('Unknown how we\'ll handle DMs. Also, need to support new servers that aren\'t configured yet.');
        }

        const cached = this._configCache[server.id];
        if (cached) {
            return cached;
        }

        const serverConfig = await ServerConfig.getFromId(this._db, server);
        this._configCache[server.id] = serverConfig;
        return serverConfig;
    }
};
