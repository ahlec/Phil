import { Client as DiscordIOClient } from 'discord.io';
import Database from '../../database';
import { ReactableCreateArgsBase, ReactableFactoryBase } from '../factory-base';
import { Emoji, JsonData, ReactableHandle } from './shared';

interface CreateArgs extends ReactableCreateArgsBase {
  tempChannelName: string;
  topic: string;
}

export default class TempChannelConfirmationReactableFactory extends ReactableFactoryBase<
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

  protected getJsonData(): JsonData {
    return {
      tempChannelName: this.args.tempChannelName,
      topic: this.args.topic,
    };
  }

  protected getEmojiReactions(): string[] {
    return [Emoji.Confirm, Emoji.Reject];
  }
}
