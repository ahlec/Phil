import { Client as DiscordIOClient, User as DiscordIOUser } from 'discord.io';
import Database from '../../database';
import { IReactableCreateArgsBase, ReactableFactoryBase } from '../factory-base'
import { PromptQueueReactableShared } from './shared';

interface ICreateArgs extends IReactableCreateArgsBase, PromptQueueReactableShared.IData {
}

export class PromptQueueReactableFactory extends ReactableFactoryBase<ICreateArgs> {
    protected readonly handle = PromptQueueReactableShared.ReactableHandle;

    constructor(readonly bot: DiscordIOClient,
        readonly db: Database,
        readonly args: ICreateArgs) {
            super(bot, db, args);
    }

    protected getJsonData(): any | null {
        const data: PromptQueueReactableShared.IData = {
            bucket: this.args.bucket,
            currentPage : this.args.currentPage,
            pageSize: this.args.pageSize,
            totalNumberPages: this.args.totalNumberPages
        };

        return data;
    }

    protected getEmojiReactions(): string[] {
        const reactions: string[] = [];

        if (this.args.currentPage > 1) {
            reactions.push(PromptQueueReactableShared.Emoji.Previous);
        }

        if (this.args.currentPage < this.args.totalNumberPages) {
            reactions.push(PromptQueueReactableShared.Emoji.Next);
        }

        return reactions;
    }
}
