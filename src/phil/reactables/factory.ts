import { Client as DiscordIOClient, Server as DiscordIOServer, User as DiscordIOUser } from 'discord.io';
import { Database } from '../database';
import { QueryResult } from 'pg';

export class ReactableFactory {
    messageId : string;
    server : DiscordIOServer;
    channelId : string;
    user : DiscordIOUser;
    timeLimit : number;
    reactableHandle : string;
    jsonData : any;

    constructor(readonly bot : DiscordIOClient, readonly db : Database) {
    }

    isValid() : boolean {
        if (!this.messageId || this.messageId.length === 0) {
            return false;
        }

        if (!this.server) {
            return false;
        }

        if (!this.channelId || this.channelId.length === 0) {
            return false;
        }

        if (!this.user) {
            return false;
        }

        if (Number.isNaN(this.timeLimit) || this.timeLimit <= 0) {
            return false;
        }

        if (!this.reactableHandle || this.reactableHandle.length === 0) {
            return false;
        }

        return true;
    }

    async create() : Promise<void> {
        if (!this.isValid()) {
            throw new Error('Attempted to create a reactable with invalid configuration.');
        }

        const results = await this.db.query(`INSERT INTO
            reactable_posts(message_id, server_id, channel_id, user_id, created, timelimit, reactable_type, jsondata)
            VALUES($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                this.messageId,
                this.server.id,
                this.channelId,
                this.user.id,
                new Date(),
                this.timeLimit,
                this.reactableHandle,
                (this.jsonData ? JSON.stringify(this.jsonData) : null)
            ]);

        if (results.rowCount === 0) {
            throw new Error('Unable to create the reactable within the database.');
        }
    }
}
