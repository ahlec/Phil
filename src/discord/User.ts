import { Client as DiscordIOClient } from 'discord.io';

import {
  SendMessageResult,
  sendMessageTemplate,
} from '@phil/utils/discord-migration';
import MessageTemplate from './MessageTemplate';

interface InternalUser {
  bot: boolean;
  discriminator: number;
  username: string;
}

class User {
  public constructor(
    private readonly internalClient: DiscordIOClient,
    private readonly internalUser: InternalUser,
    public readonly id: string
  ) {}

  public get isBot(): boolean {
    return this.internalUser.bot;
  }

  /**
   * Gets the full username of this user (the chosen username followed by the
   * hash character and four-digit discriminator).
   */
  public get fullUsername(): string {
    return `${this.internalUser.username}#${this.internalUser.discriminator}`;
  }

  public get username(): string {
    return this.internalUser.username;
  }

  public sendDirectMessage(
    template: MessageTemplate
  ): Promise<SendMessageResult> {
    return sendMessageTemplate(this.internalClient, this.id, template);
  }
}

export default User;
