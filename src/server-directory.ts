import { Server as DiscordIOServer } from 'discord.io';
import Logger from './Logger';
import LoggerDefinition from './LoggerDefinition';
import Phil from './phil';
import ServerConfig from './server-config';

interface ConfigCache {
  [serverId: string]: ServerConfig | undefined;
}

export default class ServerDirectory extends Logger {
  private configCache: ConfigCache = {};

  constructor(private readonly phil: Phil) {
    super(new LoggerDefinition('Server Directory'));
  }

  public clearCache(): void {
    this.configCache = {};
    this.write('Cache cleared.');
  }

  public async getServerConfig(
    server: DiscordIOServer
  ): Promise<ServerConfig | null> {
    if (!server) {
      throw new Error('Server was not provided to this function!');
    }

    const cached = this.configCache[server.id];
    if (cached) {
      return cached;
    }

    try {
      let serverConfig = await ServerConfig.getFromId(this.phil.db, server);
      if (!serverConfig) {
        this.write(
          `Have not encountered server ${server.id} before. Initializing.`
        );
        serverConfig = await ServerConfig.initializeDefault(
          this.phil.db,
          server
        );
      }

      this.configCache[server.id] = serverConfig;
      return serverConfig;
    } catch (e) {
      this.error(`Error when retrieving config for server ${server.id}.`);
      this.error(e);
      return null;
    }
  }
}
