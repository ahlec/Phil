import { Message as DiscordJsMessage } from 'discord.js';

import Message from './Message';
import TextChannel from './TextChannel';
import UsersDirectMessagesChannel from './UsersDirectMessagesChannel';

/**
 * An OutboundMessage is any message that was sent by this bot (as opposed to any message
 * sent by any other user or any other bot). This is not limited to messages sent during
 * the lifetime of this process, however.
 */
class OutboundMessage extends Message {
  public constructor(
    internalMessage: DiscordJsMessage,
    public readonly channel: TextChannel | UsersDirectMessagesChannel
  ) {
    super(internalMessage);
  }

  public async addReaction(reaction: string): Promise<void> {
    await this.internalMessage.react(reaction);
  }

  public async removeReaction(reaction: string): Promise<void> {
    const internalReaction = this.internalMessage.reactions.resolve(reaction);
    if (!internalReaction) {
      return;
    }

    if (!internalReaction.me) {
      return;
    }

    if (!this.internalMessage.client.user) {
      throw new Error('Do not have a client to remove the reaction from?');
    }

    await internalReaction.users.remove(this.internalMessage.client.user.id);
  }
}

export default OutboundMessage;
