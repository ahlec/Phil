import { Client as DiscordIOClient, Server as DiscordIOServer, User as DiscordIOUser } from 'discord.io';
import { Bucket } from '../buckets';
import { Database } from '../database';
import { QueryResult } from 'pg';
import { Prompt } from './prompt';
import { DiscordPromises } from '../../promises/discord';
import { OfficialDiscordEmbed } from 'official-discord';
import { PromptQueueReactableFactory } from '../reactables/prompt-queue/factory';

export class PromptQueueEntry {
    constructor(readonly position : number, readonly prompt : Prompt) {
    }
}

interface PromptQueuePostData {
    readonly channelId : string;
    readonly user : DiscordIOUser;
}

export class PromptQueue {
    readonly pageNumber : number;
    readonly totalPages : number;
    readonly hasMultiplePages : boolean;
    readonly entries : PromptQueueEntry[] = [];
    readonly count : number = 0;
    readonly unconfirmedCount : number = 0;

    private constructor(bot : DiscordIOClient, readonly bucket : Bucket, promptResults : QueryResult, countResults : QueryResult, pageNum : number, readonly pageSize : number) {
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

    async postToChannel(bot : DiscordIOClient, db : Database, postData : PromptQueuePostData) : Promise<string> {
        const messageId = await DiscordPromises.sendEmbedMessage(bot, postData.channelId, this.asEmbedObject());
        if (this.hasMultiplePages) {
            await this.setupReactable(bot, db, postData, messageId);
        }

        return messageId;
    }

    private asEmbedObject() : OfficialDiscordEmbed {
        return {
            color: 0xB0E0E6,
            title: "Prompt Queue for " + this.bucket.displayName,
            description: this.makeBodyFromQueue(),
            footer: this.makeFooterFromQueue()
        };
    }

    private makeBodyFromQueue() : string {
        if (this.entries.length === 0) {
            return 'There are no prompts in the queue right now.';
        }

        var message = ':calendar_spiral: The queue currently contains **';
        if (this.count === 1) {
            message += '1 prompt';
        } else {
            message += this.count + ' prompts';
        }

        message += '**.\n\n';

        for (let entry of this.entries) {
            message += '**' + (entry.position) + '.** ' + entry.prompt.text + '\n';
        }

        return message;
    }

    private makeFooterFromQueue() : any {
        if (!this.hasMultiplePages) {
            return;
        }

        var message = 'Viewing page ' + this.pageNumber + ' / ' + this.totalPages + '. Navigate using the arrows below.';
        return {
            text: message
        };
    }

    private async setupReactable(bot : DiscordIOClient, db : Database, postData : PromptQueuePostData, messageId : string) {
        const factory = new PromptQueueReactableFactory(bot, db, {
            messageId: messageId,
            channelId: postData.channelId,
            user: bot.users[postData.user.id],
            timeLimit: 10,
            currentPage: this.pageNumber,
            totalNumberPages: this.totalPages,
            pageSize: this.pageSize,
            bucket: this.bucket.id
        });

        await factory.create();
    }
}
