import { Client as DiscordIOClient } from 'discord.io';
import Database from '../../database';
import { ReactableCreateArgsBase, ReactableFactoryBase } from '../factory-base';
import SuggestSessionReactableShared from './shared';

interface CreateArgs extends ReactableCreateArgsBase {
  canMakeAnonymous: boolean;
}

export default class SuggestSessionReactableFactory extends ReactableFactoryBase<
  CreateArgs
> {
  protected readonly handle = SuggestSessionReactableShared.ReactableHandle;

  constructor(
    readonly bot: DiscordIOClient,
    readonly db: Database,
    readonly args: CreateArgs
  ) {
    super(bot, db, args);
  }

  protected getJsonData(): any | null {
    return null;
  }

  protected getEmojiReactions(): string[] {
    const reactions = [SuggestSessionReactableShared.Emoji.Stop];

    if (this.args.canMakeAnonymous) {
      reactions.push(SuggestSessionReactableShared.Emoji.MakeAnonymous);
    }

    return reactions;
  }
}
