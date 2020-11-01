import { OfficialDiscordReactionEvent } from 'official-discord';
import Phil from '@phil/phil';
import ReactablePost from './post';
import { ReactableType, ReactableHandler } from './types';
import PromptQueueReactableHandler from './prompt-queue/handler';
import SuggestSessionReactableHandler from './suggest-session/handler';
import { getKnownOutboundMessage } from '@phil/utils/discord-migration';

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
    event: OfficialDiscordReactionEvent
  ): Promise<void> {
    if (!this.shouldProcessEvent(event)) {
      return;
    }

    const message = getKnownOutboundMessage(
      this.phil.bot,
      event.message_id,
      event.channel_id
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
    const user = this.phil.bot.users[event.user_id];
    if (!user) {
      return false;
    }

    return !user.bot;
  }
}

export default ReactableProcessor;
