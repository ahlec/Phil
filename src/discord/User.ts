import { User as DiscordJSUser } from 'discord.js';

import MessageTemplate from './MessageTemplate';
import OutboundMessage from './OutboundMessage';
import UsersDirectMessagesChannel from './UsersDirectMessagesChannel';

import { SendMessageResult } from './types';
import { sendMessageTemplate } from './internals/sendMessageTemplate';

class User {
  public constructor(private readonly internalUser: DiscordJSUser) {
    if (internalUser.partial) {
      throw new Error(
        `Cannot construct a User class with a partial DiscordJS user (ID: ${internalUser.id})`
      );
    }
  }

  public get id(): string {
    return this.internalUser.id;
  }

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

  public async sendDirectMessage(
    template: MessageTemplate
  ): Promise<SendMessageResult> {
    const rawChannel = await this.internalUser.createDM();
    const finalRawMessage = await sendMessageTemplate(rawChannel, template);
    return {
      finalMessage: new OutboundMessage(
        finalRawMessage,
        new UsersDirectMessagesChannel(rawChannel)
      ),
    };
  }
}

export default User;
