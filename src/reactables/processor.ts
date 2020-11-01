import { OfficialDiscordReactionEvent } from 'official-discord';
import { Client as DiscordIOClient } from 'discord.io';

import OutboundMessage from '@phil/discord/OutboundMessage';
import Server from '@phil/discord/Server';
import TextChannel from '@phil/discord/TextChannel';
import UsersDirectMessagesChannel from '@phil/discord/UsersDirectMessagesChannel';

import Phil from '@phil/phil';
import ReactablePost from './post';
import { ReactableType, ReactableHandler } from './types';
import PromptQueueReactableHandler from './prompt-queue/handler';
import SuggestSessionReactableHandler from './suggest-session/handler';

export function getChannel(
  discordClient: DiscordIOClient,
  channelId: string
): TextChannel | UsersDirectMessagesChannel {
  const rawChannel = discordClient.channels[channelId];
  if (!rawChannel) {
    return new UsersDirectMessagesChannel(discordClient, channelId);
  }

  const rawServer = discordClient.servers[rawChannel.guild_id];
  if (!rawServer) {
    throw new Error(
      `Could not find server '${rawChannel.guild_id}' supposedly containing '${channelId}'.`
    );
  }

  const server = new Server(discordClient, rawServer, rawChannel.guild_id);
  return new TextChannel(discordClient, channelId, rawChannel, server);
}

class ReactableProcessor {
  private readonly handlers: {
    [type in ReactableType]: ReactableHandler<type>;
  };

  constructor(private readonly phil: Phil) {
    this.handlers = {
      [ReactableType.PromptQueue]: new PromptQueueReactableHandler(),
      [ReactableType.SuggestSession]: new SuggestSessionReactableHandler(),
    };
  }

  public async processReactionAdded(
    discordIOClient: DiscordIOClient,
    event: OfficialDiscordReactionEvent
  ): Promise<void> {
    if (!this.shouldProcessEvent(event)) {
      return;
    }

    const message = new OutboundMessage(
      discordIOClient,
      getChannel(discordIOClient, event.channel_id),
      event.message_id
    );

    const post = await ReactablePost.getFromMessage(this.phil.db, message);
    if (!post) {
      return;
    }

    if (!post.monitoredReactions.has(event.emoji.name)) {
      return;
    }

    const reactableType = this.handlers[post.type] as ReactableHandler<
      ReactableType
    >;
    if (!reactableType) {
      throw new Error(
        `Attempted to react to an unknown reactable type '${post.type}' with on message '${post.message.id}'`
      );
    }

    reactableType.processReactionAdded(this.phil, post, event);
  }

  private shouldProcessEvent(event: OfficialDiscordReactionEvent): boolean {
    const user = this.phil.discordClient.getUser(event.user_id);
    if (!user) {
      return false;
    }

    return !user.isBot;
  }
}

export default ReactableProcessor;
