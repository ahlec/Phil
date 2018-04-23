import { Client as DiscordIOClient, Server as DiscordIOServer } from 'discord.io';
import { Bucket } from '../buckets';
import { Database } from '../database';
import { QueryResult } from 'pg';
import { Prompt } from './prompt';

export class PromptQueueEntry {
    constructor(readonly position : number, readonly prompt : Prompt) {
    }
}

export class PromptQueue {
    readonly pageNumber : number;
    readonly totalPages : number;
    readonly hasMultiplePages : boolean;
    readonly entries : PromptQueueEntry[] = [];
    readonly count : number = 0;
    readonly unconfirmedCount : number = 0;

    private constructor(bot : DiscordIOClient, bucket : Bucket, promptResults : QueryResult, countResults : QueryResult, pageNum : number, pageSize : number) {
        this.pageNumber = pageNum;

        var currentQueuePosition = ( pageNum - 1 ) * pageSize + 1;
        for (let dbRow of promptResults.rows) {
            const prompt = new Prompt(bot, bucket, dbRow);
            this.entries.push(new PromptQueueEntry(currentQueuePosition, prompt));
            currentQueuePosition++;
        }

        for (let countRow of countResults.rows) {
            const dbCount = parseInt(countRow.count);
            if (parseInt(countRow.approved_by_admin) === 1) {
                this.count = dbCount;
            } else {
                this.unconfirmedCount = dbCount;
            }
        }

        this.totalPages = Math.ceil( this.count / pageSize );
        this.hasMultiplePages = (this.totalPages > 1);
    }

    static async getTotalLength(db : Database, bucket : Bucket) : Promise<number> {
        const results = await db.query(`SELECT count(*)
            FROM prompts
            WHERE bucket_id = $1 AND has_been_posted = E\'0\' AND approved_by_admin = E\'1\'`, [bucket.id]);
        return parseInt(results.rows[0].count);
    }

    static async getPromptQueue(bot : DiscordIOClient, db : Database, bucket : Bucket, pageNum : number, pageSize : number) : Promise<PromptQueue> {
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
            ORDER BY date_suggested ASC
            LIMIT $2
            OFFSET $3`, [bucket.id, pageSize, ( pageNum - 1 ) * pageSize]);
        const countResults = await db.query(`SELECT
                approved_by_admin,
                COUNT(approved_by_admin)
            FROM prompts
            WHERE has_been_posted = E'0' AND bucket_id = $1
            GROUP BY approved_by_admin`, [bucket.id]);
        return new PromptQueue(bot, bucket, promptResults, countResults, pageNum, pageSize);
    }
}
