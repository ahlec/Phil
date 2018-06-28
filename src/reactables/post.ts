import { Client as DiscordIOClient, User as DiscordIOUser } from 'discord.io';
import Database from '../database';
import { DiscordPromises } from '../promises/discord';

export default class ReactablePost {
    public static async getFromMessageId(bot: DiscordIOClient, db: Database, messageId: string): Promise<ReactablePost> {
        const results = await db.query('SELECT * FROM reactable_posts WHERE message_id = $1 LIMIT 1', [messageId]);
        if (results.rowCount === 0) {
            return null;
        }

        return new ReactablePost(bot, results.rows[0]);
    }

    public static async getAllOfTypeForUser(bot: DiscordIOClient, db: Database, userId: string, handle: string): Promise<ReactablePost[]> {
        const results = await db.query(`SELECT * FROM reactable_posts
            WHERE user_id = $1 AND reactable_type = $2`,
            [userId, handle]);
        return results.rows.map(row => new ReactablePost(bot, row));
    }

    public readonly messageId: string;
    public readonly channelId: string;
    public readonly user: DiscordIOUser;
    public readonly created: Date;
    public readonly timeLimit: number;
    public readonly reactableHandle: string;
    public readonly monitoredReactions: Set<string>;
    public readonly jsonData: any;

    private constructor(private readonly bot: DiscordIOClient, dbRow: any) {
        this.messageId = dbRow.message_id;
        this.channelId = dbRow.channel_id;
        this.user = bot.users[dbRow.user_id];
        this.created = new Date(dbRow.created);
        this.timeLimit = parseInt(dbRow.timelimit, 10);
        this.reactableHandle = dbRow.reactable_type;
        this.monitoredReactions = new Set(dbRow.monitored_reactions.split(','));
        this.jsonData = JSON.parse(dbRow.jsondata);
    }

    public isValid(): boolean {
        if (!this.user) {
            return false;
        }
    }

    public async remove(db: Database): Promise<void> {
        await db.query('DELETE FROM reactable_posts WHERE message_id = $1', [this.messageId]);
        for (const reaction of this.monitoredReactions) {
            await DiscordPromises.removeOwnReaction(this.bot, this.channelId, this.messageId, reaction);
        }
    }
}