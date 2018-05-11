
import { Phil } from './phil';
import { Server as DiscordIOServer } from 'discord.io';
import { ServerConfig } from './server-config';

interface IConfigCache {
    [serverId : string] : ServerConfig;
}

export class ServerDirectory {
    private readonly _configCache : IConfigCache = {};

    constructor(private readonly phil : Phil) {
    }

    async getServerConfig(server : DiscordIOServer) : Promise<ServerConfig> {
        if (!server) {
            throw new Error('Unknown how we\'ll handle DMs. Also, need to support new servers that aren\'t configured yet.');
        }

        const cached = this._configCache[server.id];
        if (cached) {
            return cached;
        }

        const serverConfig = await ServerConfig.getFromId(this.phil.db, server, this.phil.globalConfig);
        this._configCache[server.id] = serverConfig;
        return serverConfig;
    }
};
