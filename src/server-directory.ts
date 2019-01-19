import { Server as DiscordIOServer } from 'discord.io';
import Phil from './phil';
import ServerConfig from './server-config';

interface IConfigCache {
  [serverId: string]: ServerConfig;
}

export default class ServerDirectory {
  private readonly configCache: IConfigCache = {};

  constructor(private readonly phil: Phil) {}

  public async getServerConfig(server: DiscordIOServer): Promise<ServerConfig> {
    if (!server) {
      throw new Error('Server was not provided to this function!');
    }

    const cached = this.configCache[server.id];
    if (cached) {
      return cached;
    }

    const serverConfig = await ServerConfig.getFromId(this.phil.db, server);
    this.configCache[server.id] = serverConfig;
    return serverConfig;
  }
}
