import { ReactableFactoryBase, IReactableCreateArgsBase } from '../factory-base'
import { Client as DiscordIOClient, User as DiscordIOUser } from 'discord.io';
import { Database } from '../../database';
import { SuggestSessionReactableShared } from './shared';

interface ICreateArgs extends IReactableCreateArgsBase {
}

export class SuggestSessionReactableFactory extends ReactableFactoryBase<ICreateArgs> {
    protected readonly handle = SuggestSessionReactableShared.ReactableHandle;

    constructor(readonly bot : DiscordIOClient,
        readonly db : Database,
        readonly args : ICreateArgs) {
            super(bot, db, args);
    }

    protected getJsonData() : any | null {
        return null;
    }

    protected getEmojiReactions() : string[] {
        return [SuggestSessionReactableShared.Emoji.Stop];
    }
}
