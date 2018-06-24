import { Client as DiscordIOClient, User as DiscordIOUser } from 'discord.io';
import { DiscordPromises } from '../../promises/discord';
import Database from '../database';
import ReactablePost from './post';

export interface IReactableCreateArgsBase {
    messageId : string;
    channelId : string;
    user : DiscordIOUser;
    timeLimit : number;
}

export abstract class ReactableFactoryBase<TCreateArgs extends IReactableCreateArgsBase> {
    protected abstract readonly handle: string;

    protected constructor(readonly bot: DiscordIOClient,
        readonly db: Database,
        readonly args: TCreateArgs) {
    }

    public async create() {
        if (!this.isValid()) {
            throw new Error('The provided creation args are not valid.');
        }

        const reactions = this.getEmojiReactions();

        await this.addToDatabase(reactions);
        await this.removeAllOthers();

        for (const reaction of reactions) {
            await DiscordPromises.addReaction(this.bot,
                this.args.channelId,
                this.args.messageId,
                reaction);
        }
    }

    protected isValid(): boolean {
        if (!this.args.messageId || this.args.messageId.length === 0) {
            return false;
        }

        if (!this.args.channelId || this.args.channelId.length === 0) {
            return false;
        }

        if (!this.args.user) {
            return false;
        }

        if (Number.isNaN(this.args.timeLimit) || this.args.timeLimit <= 0) {
            return false;
        }

        return true;
    }

    protected abstract getJsonData(): any | null;
    protected abstract getEmojiReactions(): string[];

    private async addToDatabase(reactions: string[]) {
        const jsonData = this.getJsonData();
        const results = await this.db.query(`INSERT INTO
            reactable_posts(
                message_id,     channel_id,          user_id,  created, timelimit,
                reactable_type, monitored_reactions, jsondata)
            VALUES($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                this.args.messageId,
                this.args.channelId,
                this.args.user.id,
                new Date(),
                this.args.timeLimit,
                this.handle,
                reactions.join(),
                (jsonData ? JSON.stringify(jsonData) : null)
            ]);

        if (results.rowCount === 0) {
            throw new Error('Unable to create the reactable within the database.');
        }
    }

    private async removeAllOthers() {
        const posts = await ReactablePost.getAllOfTypeForUser(this.bot, this.db, this.args.user.id, this.handle);
        for (const post of posts) {
            if (post.messageId === this.args.messageId) {
                continue;
            }

            await post.remove(this.db);
        }
    }
}
