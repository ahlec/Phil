import { Client as DiscordIOClient, Server as DiscordIOServer } from 'discord.io';
import { Bucket } from '../buckets';
import { Database } from '../database';
import { QueryResult } from 'pg';
import { Prompt } from './prompt';

export class PromptQueue {
    readonly entries : Prompt[] = [];
    readonly count : number = 0;
    readonly unconfirmedCount : number = 0;

    constructor(bot : DiscordIOClient, bucket : Bucket, promptResults : QueryResult, countResults : QueryResult) {
        for (let dbRow of promptResults.rows) {
            this.entries.push(new Prompt(bot, bucket, dbRow));
        }

        for (let countRow of countResults.rows) {
            const dbCount = parseInt(countRow.count);
            if (parseInt(countRow.approved_by_admin) === 1) {
                this.count = dbCount;
            } else {
                this.unconfirmedCount = dbCount;
            }
        }
    }

    static async getTotalLength(db : Database, bucket : Bucket) : Promise<number> {
        const results = await db.query(`SELECT count(*)
            FROM prompts
            WHERE bucket_id = $1 AND has_been_posted = E\'0\' AND approved_by_admin = E\'1\'`, [bucket.id]);
        return parseInt(results.rows[0].count);
    }

    static async getPromptQueue(bot : DiscordIOClient, db : Database, bucket : Bucket, maxNumResults : number) : Promise<PromptQueue> {
        const promptResults = await db.query(`SELECT
                prompt_id,
                suggesting_user,
                suggesting_userid,
                prompt_number,
                prompt_date,
                prompt_text,
                submitted_anonymously,
                bucket_id
            FROM prompts
            WHERE has_been_posted = E'0' AND approved_by_admin = E'1' AND bucket_id = $1
            ORDER BY date_suggested ASC LIMIT $2`, [bucket.id, maxNumResults]);
        const countResults = await db.query(`SELECT
                approved_by_admin,
                COUNT(approved_by_admin)
            FROM prompts
            WHERE has_been_posted = E'0' AND bucket_id = $1
            GROUP BY approved_by_admin`, [bucket.id]);
        return new PromptQueue(bot, bucket, promptResults, countResults);
    }
}
