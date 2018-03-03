'use strict';

import { Client as DiscordIOClient, Server as DiscordIOServer } from 'discord.io';
import { Database } from './database';
import { QueryResult } from 'pg';
import { Bucket } from './buckets';
import { instance as DiscordPromises } from '../promises/discord';
import { BotUtils } from './utils';

const assert = require('assert');

const LEADERBOARD_SIZE = 10;

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

export class PromptQueue {
    readonly entries : Prompt[] = [];

    constructor(bot : DiscordIOClient, bucket : Bucket, results : QueryResult) {
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

export class LeaderboardEntry {
    readonly userId : string;
    readonly displayName : string;
    readonly isStillInServer : boolean;
    readonly score : number;

    constructor(bot : DiscordIOClient, server : DiscordIOServer, dbRow : any) {
        this.userId = dbRow.suggesting_userid;

        const member = server.members[this.userId];
        const currentUserDisplayName = BotUtils.getUserDisplayName(bot, server.id, this.userId);

        this.displayName = (currentUserDisplayName || dbRow.suggesting_user);
        this.isStillInServer = (member != null);
        this.score = parseInt(dbRow.score);
    }
}

export class Leaderboard {
    readonly entries : LeaderboardEntry[] = [];

    constructor(bot : DiscordIOClient, server : DiscordIOServer, results : QueryResult) {
        for (let index = 0; index < results.rowCount; ++index) {
            this.entries.push(new LeaderboardEntry(bot, server, results.rows[0]));
        }
    }

    static getLeaderboard(bot : DiscordIOClient, db : Database, server : DiscordIOServer) : Promise<Leaderboard> {
        return db.query(`SELECT suggesting_userid, suggesting_user, count(prompt_id) as "score"
                FROM prompts p
                JOIN prompt_buckets pb
                    ON p.bucket_id = pb.bucket_id
                WHERE approved_by_admin = E'1' AND pb.server_id = $1
                GROUP BY suggesting_userid, suggesting_user
                ORDER BY score DESC
                LIMIT $2`, [server.id, LEADERBOARD_SIZE])
            .then(results => new Leaderboard(bot, server, results));
    }
}

export class UnconfirmedPromptTally {
    readonly bucketId : number;
    readonly bucketHandle : string;
    readonly bucketDisplayName : string;
    readonly numUnconfirmed : number;

    constructor(dbRow : any) {
        this.bucketId = parseInt(dbRow.bucket_id);
        this.bucketHandle = dbRow.reference_handle;
        this.bucketDisplayName = dbRow.display_name;
        this.numUnconfirmed = parseInt(dbRow.total);
    }

    static collectForServer(db : Database, serverId : string) : Promise<UnconfirmedPromptTally[]> {
        return db.query(`SELECT pb.bucket_id, reference_handle, display_name, count(*) as "total"
                FROM prompts p
                JOIN prompt_buckets pb
                    ON p.bucket_id = pb.bucket_id
                WHERE pb.server_id = $1 AND approved_by_admin = E'0'
                GROUP BY pb.bucket_id, pb.reference_handle, pb.display_name`, [serverId])
            .then(results => {
                var counts = [];

                for (let dbRow of results.rows) {
                    counts.push(new UnconfirmedPromptTally(dbRow));
                }

                return counts;
            });
    }
}

interface ConfirmRejectNumberFunc {
    (bot : DiscordIOClient, db : Database, promptId : number) : Promise<any>;
}

interface ConfirmRejectResults {
    numSuccessful : number;
    numFailed : number;
}

export class ConfirmRejectNumberSpan {
    private readonly numbers : number[];

    constructor(numbers : number[]) {
        this.numbers = numbers;
    }

    static getFromCommandArgs(commandArgs : string[]) : ConfirmRejectNumberSpan {
        if (commandArgs.length !== 1) {
            throw new Error('You must provide a single parameter. This can be either an individual number, or a range of numbers.');
        }

        if (BotUtils.isNumeric(commandArgs[0])) {
            const singleNumber = parseInt(commandArgs[0]);
            return new ConfirmRejectNumberSpan([singleNumber]);
        }

        const numberSpan = ConfirmRejectNumberSpan.parseNumberSpan(commandArgs[0]);
        if (numberSpan.length === 0) {
            throw new Error('You must specify at least one number as an argument in order to use this command.');
        }

        return new ConfirmRejectNumberSpan(numberSpan);
    }

    performAction(bot : DiscordIOClient, db : Database, channelId : string, dbActionFunc : ConfirmRejectNumberFunc) : Promise<ConfirmRejectResults> {
        const results = {
            numSuccessful: 0,
            numFailed: 0
        };

        var promise = Promise.resolve(results);
        for (let number of this.numbers) {
            number = number - 1; // Public facing, it's 1-based, but in the database it's 0-based
            promise = promise.then(r => this.confirmOrRejectNumber(r, bot, db, channelId, number, dbActionFunc));
        }

        return promise;
    }

    private static parseNumberSpan(arg : string) : number[] {
        const separatedPieces = arg.split('-');
        if (separatedPieces.length !== 2) {
            throw new Error('You must use the format of `1-9` or `3-5` to indicate a range of numbers.');
        }

        if (!BotUtils.isNumeric(separatedPieces[0]) || !BotUtils.isNumeric(separatedPieces[1])) {
            throw new Error('One or both of the arguments you provided in the range were not actually numbers.');
        }

        const lowerBound = parseInt(separatedPieces[0]);
        const upperBound = parseInt(separatedPieces[1]);
        if (upperBound < lowerBound) {
            throw new Error('The range you indicated was a negative range (the second number came before the first number)!');
        }

        var includedNumbers = [];
        for (let num = lowerBound; num <= upperBound; ++num) {
            includedNumbers.push(num);
        }

        return includedNumbers;
    }

    private confirmOrRejectNumber(crResults : ConfirmRejectResults, bot : DiscordIOClient, db : Database, channelId : string, number : number, dbActionFunc : ConfirmRejectNumberFunc) : Promise<ConfirmRejectResults> {
        return db.query('SELECT prompt_id FROM prompt_confirmation_queue WHERE channel_id = $1 and confirm_number = $2', [channelId, number])
            .then(results => {
                if (results.rowCount === 0) {
                    return crResults;
                }

                const promptId = results.rows[0].prompt_id;
                return dbActionFunc(bot, db, promptId)
                    .then(() => this.removeNumberFromConfirmationQueue(db, channelId, number, crResults));
            });
    }

    private removeNumberFromConfirmationQueue(db : Database, channelId : string, number : number, crResults : ConfirmRejectResults) : Promise<ConfirmRejectResults> {
        return db.query('DELETE FROM prompt_confirmation_queue WHERE channel_id = $1 AND confirm_number = $2', [channelId, number])
            .then(results => {
                if (results.rowCount === 0) {
                    throw new Error('Could not remove a prompt from the unconfirmed confirmation queue.');
                }

                crResults.numSuccessful++;
                return crResults;
            });
    }
}
