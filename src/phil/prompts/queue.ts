import { Client as DiscordIOClient, Server as DiscordIOServer } from 'discord.io';
import { Bucket } from '../buckets';
import { Database } from '../database';
import { QueryResult } from 'pg';
import { Prompt } from './prompt';

export class PromptQueue {
    readonly entries : Prompt[] = [];
    readonly length : number;

    constructor(bot : DiscordIOClient, bucket : Bucket, results : QueryResult) {
        this.length = results.rowCount;
        for (let index = 0; index < results.rowCount; ++index) {
            this.entries.push(new Prompt(bot, bucket, results.rows[index]));
        }
    }

    static getTotalLength(db : Database, bucket : Bucket) : Promise<number> {
        return db.query('SELECT count(*) FROM prompts WHERE bucket_id = $1 AND has_been_posted = E\'0\' AND approved_by_admin = E\'1\'', [bucket.id])
            .then(results => parseInt(results.rows[0].count));
    }

    static getPromptQueue(bot : DiscordIOClient, db : Database, bucket : Bucket, maxNumResults : number) : Promise<PromptQueue> {
        return db.query(`SELECT prompt_id, suggesting_user, suggesting_userid, prompt_number, prompt_date, prompt_text, submitted_anonymously, bucket_id
                FROM prompts
                WHERE has_been_posted =E'0' AND approved_by_admin = E'1' AND bucket_id = $1 ORDER BY date_suggested ASC LIMIT $2`, [bucket.id, maxNumResults])
            .then(results => new PromptQueue(bot, bucket, results));
    }
}
