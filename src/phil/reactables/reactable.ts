import { Client as DiscordIOClient, Server as DiscordIOServer, User as DiscordIOUser } from 'discord.io';
import { Database } from '../database';
import { QueryResult } from 'pg';

export class Reactable {
    readonly messageId : string;
    readonly server : DiscordIOServer;
    readonly channelId : string;
    readonly user : DiscordIOUser;
    readonly created : Date;
    readonly timeLimit : number;
    readonly reactableHandle : string;
    readonly jsonData : any;

    private constructor(bot : DiscordIOClient, dbRow : any) {
        this.messageId = dbRow.message_id;
        this.server = bot.servers[dbRow.server_id];
        this.channelId = dbRow.channel_id;
        this.user = bot.users[dbRow.user_id];
        this.created = new Date(dbRow.created);
        this.timeLimit = parseInt(dbRow.timelimit);
        this.reactableHandle = dbRow.reactable_type;
        this.jsonData = JSON.parse(dbRow.jsondata);
    }

    static async getFromMessageId(bot : DiscordIOClient, db : Database, messageId : string) : Promise<Reactable> {
        const results = await db.query('SELECT * FROM reactables WHERE message_id = $1 LIMIT 1', [messageId]);
        if (results.rowCount === 0) {
            return null;
        }

        return new Reactable(bot, results.rows[0]);
    }

    isValid() : boolean {
        if (!this.server) {
            return false;
        }

        if (!this.user) {
            return false;
        }
    }
}
