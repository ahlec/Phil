import { Client as DiscordIOClient, User as DiscordIOUser } from 'discord.io';
import { Database } from '../database';
import { DiscordPromises } from '../../promises/discord';

export interface IReactableCreateArgsBase {
    messageId : string;
    channelId : string;
    user : DiscordIOUser;
    timeLimit : number;
}

export abstract class ReactableFactoryBase<TCreateArgs extends IReactableCreateArgsBase> {
    protected abstract readonly handle : string;

    protected constructor(readonly bot : DiscordIOClient,
        readonly db : Database,
        readonly args : TCreateArgs) {
    }

    async create() {
        if (!this.isValid()) {
            throw new Error('The provided creation args are not valid.');
        }

        await this.addToDatabase();
        const reactions = this.getEmojiReactions();

        for (const reaction of reactions) {
            await DiscordPromises.addReaction(this.bot,
                this.args.channelId,
                this.args.messageId,
                reaction);
        }
    }

    protected isValid() : boolean {
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

    protected abstract getJsonData() : any | null;
    protected abstract getEmojiReactions() : string[];

    private async addToDatabase() {
        const jsonData = this.getJsonData();
        const results = await this.db.query(`INSERT INTO
            reactable_posts(message_id, channel_id, user_id, created, timelimit, reactable_type, jsondata)
            VALUES($1, $2, $3, $4, $5, $6, $7)`,
            [
                this.args.messageId,
                this.args.channelId,
                this.args.user.id,
                new Date(),
                this.args.timeLimit,
                this.handle,
                (jsonData ? JSON.stringify(jsonData) : null)
            ]);

        if (results.rowCount === 0) {
            throw new Error('Unable to create the reactable within the database.');
        }
    }
}
