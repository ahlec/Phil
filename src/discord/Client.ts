import { Client as DiscordIOClient } from 'discord.io';

import Server from './Server';
import User from './User';

class Client {
  public constructor(private readonly internalClient: DiscordIOClient) {}

  public get inviteUrl(): string {
    return this.internalClient.inviteURL;
  }

  public getServer(serverId: string): Server | null {
    const internalServer = this.internalClient.servers[serverId];
    if (!internalServer) {
      return null;
    }

    return new Server(this.internalClient, internalServer, serverId);
  }

  /**
   * Retrieves a user via their snowflake ID. If there is no user in Discord's
   * database with that snowflake, OR if there is a user but this bot does not
   * share any servers with that user, this will return null.
   * @param userId The snowflake ID of the user to be retrieved.
   */
  public getUser(userId: string): User | null {
    const internalUser = this.internalClient.users[userId];
    if (!internalUser) {
      return null;
    }

    return new User(this.internalClient, internalUser, userId);
  }
}

export default Client;
