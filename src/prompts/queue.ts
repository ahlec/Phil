import Bucket from 'buckets';
import Database from 'database';
import { Client as DiscordIOClient, User as DiscordIOUser } from 'discord.io';
import { OfficialDiscordEmbed } from 'official-discord';
import { QueryResult } from 'pg';
import { DiscordPromises } from 'promises/discord';
import { PromptQueueReactableFactory } from 'reactables/prompt-queue/factory';
import Prompt from './prompt';

export interface IPromptQueueEntry {
    readonly position: number;
    readonly prompt: Prompt;
}

interface IPromptQueuePostData {
    readonly channelId : string;
    readonly user : DiscordIOUser;
}

export class PromptQueue {
    public static async getTotalLength(db: Database, bucket: Bucket): Promise<number> {
        const results = await db.query(`SELECT count(*)
            FROM prompts
            WHERE bucket_id = $1 AND has_been_posted = E\'0\' AND approved_by_admin = E\'1\'`, [bucket.id]);
        return parseInt(results.rows[0].count, 10);
    }

    public static async getPromptQueue(bot: DiscordIOClient, db: Database, bucket: Bucket, pageNum: number, pageSize: number): Promise<PromptQueue> {
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

    public readonly pageNumber: number;
    public readonly totalPages: number;
    public readonly hasMultiplePages: boolean;
    public readonly entries: ReadonlyArray<IPromptQueueEntry> = [];
    public readonly count: number = 0;
    public readonly unconfirmedCount: number = 0;

    private constructor(bot: DiscordIOClient,
        readonly bucket: Bucket,
        promptResults: QueryResult,
        countResults: QueryResult,
        pageNum: number,
        readonly pageSize: number) {
        this.pageNumber = pageNum;

        let currentQueuePosition = ( pageNum - 1 ) * pageSize + 1;
        const mutableEntries: IPromptQueueEntry[] = [];
        for (const dbRow of promptResults.rows) {
            const prompt = new Prompt(bot, bucket, dbRow);
            mutableEntries.push({position: currentQueuePosition, prompt});
            currentQueuePosition++;
        }
        this.entries = mutableEntries;

        for (const countRow of countResults.rows) {
            const dbCount = parseInt(countRow.count, 10);
            if (parseInt(countRow.approved_by_admin, 10) === 1) {
                this.count = dbCount;
            } else {
                this.unconfirmedCount = dbCount;
            }
        }

        this.totalPages = Math.ceil( this.count / pageSize );
        this.hasMultiplePages = (this.totalPages > 1);
    }

    public async postToChannel(bot: DiscordIOClient, db: Database, postData: IPromptQueuePostData): Promise<string> {
        const messageId = await DiscordPromises.sendEmbedMessage(bot, postData.channelId, this.asEmbedObject());
        if (this.hasMultiplePages) {
            await this.setupReactable(bot, db, postData, messageId);
        }

        return messageId;
    }

    private asEmbedObject(): OfficialDiscordEmbed {
        return {
            color: 0xB0E0E6,
            description: this.makeBodyFromQueue(),
            footer: this.makeFooterFromQueue(),
            title: "Prompt Queue for " + this.bucket.displayName
        };
    }

    private makeBodyFromQueue() : string {
        if (this.entries.length === 0) {
            return 'There are no prompts in the queue right now.';
        }

        let message = ':calendar_spiral: The queue currently contains **';
        if (this.count === 1) {
            message += '1 prompt';
        } else {
            message += this.count + ' prompts';
        }

        message += '**.\n\n';

        for (const entry of this.entries) {
            message += '**' + (entry.position) + '.** ' + entry.prompt.text + '\n';
        }

        return message;
    }

    private makeFooterFromQueue() : any {
        if (!this.hasMultiplePages) {
            return;
        }

        const message = 'Viewing page ' + this.pageNumber + ' / ' + this.totalPages + '. Navigate using the arrows below.';
        return {
            text: message
        };
    }

    private async setupReactable(bot: DiscordIOClient, db: Database, postData: IPromptQueuePostData, messageId: string) {
        const factory = new PromptQueueReactableFactory(bot, db, {
            bucket: this.bucket.id,
            channelId: postData.channelId,
            currentPage: this.pageNumber,
            messageId,
            pageSize: this.pageSize,
            timeLimit: 10,
            totalNumberPages: this.totalPages,
            user: bot.users[postData.user.id]
        });

        await factory.create();
    }
}
