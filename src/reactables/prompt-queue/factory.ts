import { Client as DiscordIOClient } from 'discord.io';
import Database from '../../database';
import { ReactableCreateArgsBase, ReactableFactoryBase } from '../factory-base';
import { Data, Emoji, ReactableHandle } from './shared';

interface CreateArgs extends ReactableCreateArgsBase, Data {}

export class PromptQueueReactableFactory extends ReactableFactoryBase<
  CreateArgs
> {
  protected readonly handle = ReactableHandle;

  constructor(
    readonly bot: DiscordIOClient,
    readonly db: Database,
    readonly args: CreateArgs
  ) {
    super(bot, db, args);
  }

  protected getJsonData(): any | null {
    const data: Data = {
      bucket: this.args.bucket,
      currentPage: this.args.currentPage,
      pageSize: this.args.pageSize,
      totalNumberPages: this.args.totalNumberPages,
    };

    return data;
  }

  protected getEmojiReactions(): string[] {
    const reactions: string[] = [];

    if (this.args.currentPage > 1) {
      reactions.push(Emoji.Previous);
    }

    if (this.args.currentPage < this.args.totalNumberPages) {
      reactions.push(Emoji.Next);
    }

    return reactions;
  }
}
