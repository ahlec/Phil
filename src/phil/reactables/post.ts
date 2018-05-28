import { Client as DiscordIOClient, User as DiscordIOUser } from 'discord.io';
import { Database } from '../database';
import { DiscordPromises } from '../../promises/discord';

export class ReactablePost {
    readonly messageId : string;
    readonly channelId : string;
    readonly user : DiscordIOUser;
    readonly created : Date;
    readonly timeLimit : number;
    readonly reactableHandle : string;
    readonly monitoredReactions : Set<string>;
    readonly jsonData : any;

    private constructor(private readonly bot : DiscordIOClient, dbRow : any) {
        this.messageId = dbRow.message_id;
        this.channelId = dbRow.channel_id;
        this.user = bot.users[dbRow.user_id];
        this.created = new Date(dbRow.created);
        this.timeLimit = parseInt(dbRow.timelimit);
        this.reactableHandle = dbRow.reactable_type;
        this.monitoredReactions = new Set(dbRow.monitored_reactions.split(','));
        this.jsonData = JSON.parse(dbRow.jsondata);
    }

    static async getFromMessageId(bot : DiscordIOClient, db : Database, messageId : string) : Promise<ReactablePost> {
        const results = await db.query('SELECT * FROM reactable_posts WHERE message_id = $1 LIMIT 1', [messageId]);
        if (results.rowCount === 0) {
            return null;
        }

        return new ReactablePost(bot, results.rows[0]);
    }

    static async getAllOfTypeForUser(bot : DiscordIOClient, db : Database, userId : string, handle : string) : Promise<ReactablePost[]> {
        const posts : ReactablePost[] = [];
        const results = await db.query(`SELECT * FROM reactable_posts
            WHERE user_id = $1 AND reactable_type = $2`,
            [userId, handle]);

        for (let row of results.rows) {
            posts.push(new ReactablePost(bot, row));
        }

        return posts;
    }

    isValid() : boolean {
        if (!this.user) {
            return false;
        }
    }

    async remove(db : Database) : Promise<void> {
        await db.query('DELETE FROM reactable_posts WHERE message_id = $1', [this.messageId]);
        for (let reaction of this.monitoredReactions) {
            await DiscordPromises.removeOwnReaction(this.bot, this.channelId, this.messageId, reaction);
        }
    }
}
