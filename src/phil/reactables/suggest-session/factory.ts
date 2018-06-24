import { Client as DiscordIOClient, User as DiscordIOUser } from 'discord.io';
import Database from '../../database';
import { IReactableCreateArgsBase, ReactableFactoryBase } from '../factory-base'
import SuggestSessionReactableShared from './shared';

interface ICreateArgs extends IReactableCreateArgsBase {
    canMakeAnonymous: boolean;
}

export default class SuggestSessionReactableFactory extends ReactableFactoryBase<ICreateArgs> {
    protected readonly handle = SuggestSessionReactableShared.ReactableHandle;

    constructor(readonly bot: DiscordIOClient,
        readonly db: Database,
        readonly args: ICreateArgs) {
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
