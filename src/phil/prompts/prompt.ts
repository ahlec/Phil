import { Client as DiscordIOClient, Server as DiscordIOServer } from 'discord.io';
import { Database } from '../database';
import { QueryResult } from 'pg';
import { Bucket } from '../buckets';
import { DiscordPromises } from '../../promises/discord';
import { BotUtils } from '../utils';

export class Prompt {
    readonly userId : string;
    readonly displayName : string;
    readonly isStillInServer : boolean;
    readonly promptId : number;
    readonly datePosted : Date | null;
    readonly promptNumber : number | null;
    readonly text : string;
    readonly submittedAnonymously : boolean;
    readonly bucketId : number;

    constructor(bot : DiscordIOClient, bucket : Bucket, dbRow : any) {
        const server = bot.servers[bucket.serverId];
        const userId = dbRow.suggesting_userid;
        const member = server.members[userId];
        const currentUserDisplayName = BotUtils.getUserDisplayName(bot, bucket.serverId, userId);

        this.userId = userId;
        this.displayName = (currentUserDisplayName || dbRow.suggesting_user);
        this.isStillInServer = (member != null);
        this.promptId = dbRow.prompt_id;
        this.datePosted = (dbRow.prompt_date ? new Date(dbRow.prompt_date) : null);
        this.promptNumber = dbRow.prompt_number;
        this.text = dbRow.prompt_text;
        this.submittedAnonymously = (parseInt(dbRow.submitted_anonymously) === 1);
        this.bucketId = parseInt(dbRow.bucket_id);
    }

    static getFromId(bot : DiscordIOClient, db : Database, promptId : number) : Promise<Prompt> {
        return db.query(`SELECT prompt_id, suggesting_user, suggesting_userid, prompt_number, prompt_date, prompt_text, submitted_anonymously, bucket_id
                FROM prompts
                WHERE prompt_id = $1`, [promptId])
            .then(results => {
                if (results.rowCount === 0) {
                    return null;
                }

                return Bucket.getFromId(bot, db, results.rows[0].bucket_id)
                    .then(bucket => new Prompt(bot, bucket, results.rows[0]));
            });
    }

    static getCurrentPrompt(bot : DiscordIOClient, db : Database, bucket : Bucket) : Promise<Prompt> {
        return db.query(`SELECT prompt_id, suggesting_user, suggesting_userid, prompt_number, prompt_date, prompt_text, submitted_anonymously, bucket_id
                FROM prompts
                WHERE bucket_id = $1 AND has_been_posted = E'1'
                ORDER BY prompt_date DESC
                LIMIT 1`, [bucket.id])
            .then(results => {
                if (results.rowCount === 0) {
                    return null;
                }

                return new Prompt(bot, bucket, results.rows[0]);
            });
    }

    static getUnconfirmedPrompts(bot : DiscordIOClient, db : Database, bucket : Bucket, maxNumResults : number) : Promise<Prompt[]> {
        return db.query('SELECT prompt_id, suggesting_user, suggesting_userid, -1 as "prompt_number", NULL as prompt_date, prompt_text, submitted_anonymously, bucket_id FROM prompts WHERE bucket_id = $1 AND approved_by_admin = E\'0\' ORDER BY date_suggested ASC LIMIT $2', [bucket.id, maxNumResults])
            .then(results => {
                var list = [];

                for (let index = 0; index < results.rowCount; ++index) {
                    list.push(new Prompt(bot, bucket, results.rows[index]));
                }

                return list;
            });
    }

    sendToChannel(bot : DiscordIOClient, channelId : string, bucket : Bucket, promptNumber : number) : Promise<string> {
        return DiscordPromises.sendEmbedMessage(bot, channelId, {
            color: 0xB0E0E6,
            title: bucket.promptTitleFormat.replace(/\{0\}/g, promptNumber.toString()),
            description: this.text,
            footer: {
                text: this.getPromptMessageFooter()
            }
        });
    }

    postAsNewPrompt(bot : DiscordIOClient, db : Database, now : Date) {
        return Bucket.getFromId(bot, db, this.bucketId)
            .then(bucket => {
                return db.query('SELECT prompt_number FROM prompts WHERE has_been_posted = E\'1\' AND bucket_id = $1 ORDER BY prompt_number DESC LIMIT 1', [bucket.id])
                    .then(results => (results.rowCount > 0 ? results.rows[0].prompt_number + 1 : 1))
                    .then(promptNumber => {
                        return db.query('UPDATE prompts SET has_been_posted = E\'1\', prompt_number = $1, prompt_date = $2 WHERE prompt_id = $3', [promptNumber, now, this.promptId])
                            .then(innerResults => {
                                if (innerResults.rowCount === 0) {
                                    throw new Error('We found a prompt in the queue, but we couldn\'t update it to mark it as being posted.');
                                }
                            })
                            .then(() => this.postNewPromptToChannel(bot, bucket, promptNumber));
                    });
            });
    }

    private getPromptMessageFooter() : string {
        var footer = 'This was suggested ';

        if (this.submittedAnonymously) {
            footer += 'anonymously';
        } else {
            footer += 'by ' + this.displayName;
            if (!this.isStillInServer) {
                footer += ' (who is no longer in server)';
            }
        }

        footer += '. You can suggest your own by using ' + process.env.COMMAND_PREFIX + 'suggest.';
        return footer;
    }

    private postNewPromptToChannel(bot : DiscordIOClient, bucket : Bucket, promptNumber : number) : Promise<string> {
        return this.sendToChannel(bot, bucket.channelId, bucket, promptNumber)
            .then(messageId => {
                if (!bucket.shouldPinPosts) {
                    return messageId;
                }

                return DiscordPromises.pinMessage(bot, bucket.channelId, messageId)
                    .then(() => messageId);
            });
    }
}
