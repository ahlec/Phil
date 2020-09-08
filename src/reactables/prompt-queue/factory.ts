import { Client as DiscordIOClient } from 'discord.io';

import Database from '@phil/database';
import ReactableFactoryBase, {
  ReactableCreationArgs,
} from '@phil/reactables/factory-base';
import { ReactableType } from '@phil/reactables/types';

import { Data, Emoji } from './shared';

class PromptQueueReactableFactory extends ReactableFactoryBase<
  ReactableType.PromptQueue
> {
  public constructor(
    discordClient: DiscordIOClient,
    database: Database,
    creationArgs: ReactableCreationArgs,
    data: Data
  ) {
    super(
      ReactableType.PromptQueue,
      discordClient,
      database,
      creationArgs,
      data
    );
  }

  protected getEmojiReactions(): readonly string[] {
    const reactions: string[] = [];

    if (this.data.currentPage > 1) {
      reactions.push(Emoji.Previous);
    }

    if (this.data.currentPage < this.data.totalNumberPages) {
      reactions.push(Emoji.Next);
    }

    return reactions;
  }
}

export default PromptQueueReactableFactory;
