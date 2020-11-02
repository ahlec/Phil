import OutboundMessage from '@phil/discord/OutboundMessage';

import Phil from '@phil/phil';
import ReactablePost from './post';
import { ReactableType, ReactableHandler } from './types';
import PromptQueueReactableHandler from './prompt-queue/handler';
import SuggestSessionReactableHandler from './suggest-session/handler';
import { Reaction } from '@phil/discord/types';
import Message from '@phil/discord/Message';

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
    reaction: Reaction,
    message: Message
  ): Promise<void> {
    if (reaction.user.isBot) {
      return;
    }

    if (!(message instanceof OutboundMessage)) {
      // We only care about reactions that are left on one of Phil's messages.
      return;
    }

    const post = await ReactablePost.getFromMessage(this.phil.db, message);
    if (!post) {
      return;
    }

    if (!post.monitoredReactions.has(reaction.name)) {
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

    reactableType.processReactionAdded(this.phil, post, reaction);
  }
}

export default ReactableProcessor;
