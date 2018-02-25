'use strict';

import { Client as DiscordIOClient, Server as DiscordIOServer } from 'discord.io';
import { Database } from './database';
import { QueryResult } from 'pg';
import { BotUtils } from './utils';

const assert = require('assert');
const moment = require('moment');

export enum BucketFrequency {
    Daily = 0,
    Weekly = 1,
    Monthly = 2,
    Yearly = 3,
    Immediately = 4
}

const frequencyDisplayStrings = {
    [BucketFrequency.Daily]: 'Daily',
    [BucketFrequency.Weekly]: 'Weekly',
    [BucketFrequency.Monthly]: 'Monthly',
    [BucketFrequency.Yearly]: 'Yearly',
    [BucketFrequency.Immediately]: 'Immediately'
};

const frequencyFromStrings : { [name : string] : BucketFrequency } = {
    'daily': BucketFrequency.Daily,
    'weekly': BucketFrequency.Weekly,
    'monthly': BucketFrequency.Monthly,
    'yearly': BucketFrequency.Yearly,
    'immediately': BucketFrequency.Immediately
};

function throwMultipleUnspecifiedBucketsError(serverBuckets : Bucket[], commandName : string) {
    if (serverBuckets.length === 0) {
        throw new Error('There are no prompt buckets configured on this server.');
    }

    var message = 'This command must be provided the valid reference handle of one of the buckets configured on this server:\n\n';

    for (let bucket of serverBuckets) {
        message += '`' + bucket.handle + '` - ' + bucket.displayName + ' (';

        if (bucket.isValid) {
            message += 'posts to <#' + bucket.channelId + '>';
        } else {
            message += 'configuration invalid';
        }

        message += ')\n';
    }

    const randomBucket = BotUtils.getRandomArrayEntry(serverBuckets);
    message += '\nPlease try the command once more, specifying which bucket, like `' + process.env.COMMAND_PREFIX + commandName + ' ' + randomBucket.handle + '`.';
    throw new Error(message);
}

function _getOnlyBucketOnServer(serverBuckets : Bucket[], commandName : string, allowInvalidServers : boolean) : Bucket {
    if (serverBuckets.length === 1 && (allowInvalidServers || serverBuckets[0].isValid)) {
        return serverBuckets[0];
    }

    throwMultipleUnspecifiedBucketsError(serverBuckets, commandName);
}

function getAllServersUserIn(bot : DiscordIOClient, userId : string) : string[] {
    const serverIds = [];

    for (let serverId in bot.servers) {
        let server = bot.servers[serverId];
        if (!server.members[userId]) {
            continue;
        }

        serverIds.push(serverId);
    }

    return serverIds;
}

export class Bucket {
    readonly id : number;
    readonly serverId : string;
    readonly channelId : string;
    readonly isValid : boolean;
    readonly handle : string;
    readonly displayName : string;
    readonly isPaused : boolean;
    readonly shouldPinPosts : boolean;
    readonly requiredRoleId : string | null;
    readonly alertWhenLow : boolean;
    readonly frequency : BucketFrequency;
    readonly frequencyDisplayName : string;
    readonly promptTitleFormat : string;

    constructor(bot : DiscordIOClient, dbRow : any) {
        var isValid = Bucket.determineIsBucketValid(dbRow, bot);
        var bucketFrequency = frequencyFromStrings[dbRow.frequency];
        assert(bucketFrequency !== undefined && bucketFrequency !== null);

        this.id = parseInt(dbRow.bucket_id);
        this.serverId = dbRow.server_id;
        this.channelId = dbRow.channel_id;
        this.isValid = isValid;
        this.handle = dbRow.reference_handle;
        this.displayName = dbRow.display_name;
        this.isPaused = (parseInt(dbRow.is_paused) === 1);
        this.shouldPinPosts = (parseInt(dbRow.should_pin_posts) === 1);
        this.requiredRoleId = dbRow.required_role_id;
        this.alertWhenLow = (parseInt(dbRow.alert_when_low) === 1);
        this.frequency = bucketFrequency;
        this.frequencyDisplayName = frequencyDisplayStrings[bucketFrequency];
        this.promptTitleFormat = dbRow.prompt_title_format;
    }

    static async getFromId(bot : DiscordIOClient, db : Database, bucketId : number) : Promise<Bucket> {
        const results = await db.query('SELECT * FROM prompt_buckets WHERE bucket_id = $1', [bucketId]);
        if (results.rowCount === 0) {
            return null;
        }

        assert(results.rowCount === 1);
        return new Bucket(bot, results.rows[0]);
    }

    static async getFromChannelId(bot : DiscordIOClient, db : Database, channelId : string) : Promise<Bucket> {
        const results = await db.query('SELECT * FROM prompt_buckets WHERE channel_id = $1', [channelId]);
        if (results.rowCount === 0) {
            return null;
        }

        assert(results.rowCount === 1);
        return new Bucket(bot, results.rows[0]);
    }

    static async getFromReferenceHandle(bot : DiscordIOClient, db : Database, server : DiscordIOServer, referenceHandle : string) : Promise<Bucket> {
        const results = await db.query('SELECT * FROM prompt_buckets WHERE server_id = $1 AND reference_handle = $2', [server.id, referenceHandle]);
        if (results.rowCount === 0) {
            return null;
        }

        assert(results.rowCount === 1);
        return new Bucket(bot, results.rows[0]);
    }

    static async getAllForServer(bot : DiscordIOClient, db : Database, serverId : string) : Promise<Bucket[]> {
        const results = await db.query('SELECT * FROM prompt_buckets WHERE server_id = $1', [serverId]);
        return Bucket.parseListOfDbBuckets(bot, results);
    }

    static async getAllForUser(bot : DiscordIOClient, db : Database, userId : string) : Promise<Bucket[]> {
        const serverIds = getAllServersUserIn(bot, userId);
        const results = await db.query('SELECT * FROM prompt_buckets WHERE server_id = ANY($1)', [serverIds]);
        return Bucket.parseListOfDbBuckets(bot, results);
    }

    static async retrieveFromCommandArgs(bot : DiscordIOClient, db : Database, commandArgs : string[], server : DiscordIOServer, commandName : string, allowInvalidServers : boolean) : Promise<Bucket> {
        const firstParameter = commandArgs[0];
        if (!firstParameter || firstParameter.length === 0) {
            const serverBuckets = await Bucket.getAllForServer(bot, db, server.id);
            return _getOnlyBucketOnServer(serverBuckets, commandName, allowInvalidServers);
        }

        const bucket = await Bucket.getFromReferenceHandle(bot, db, server, firstParameter);
        if (bucket === null || (!allowInvalidServers && !bucket.isValid)) {
            const serverBuckets = await Bucket.getAllForServer(bot, db, server.id);
            throwMultipleUnspecifiedBucketsError(serverBuckets, commandName);
        }

        return bucket;
    }

    private static parseListOfDbBuckets(bot : DiscordIOClient, results : QueryResult) : Bucket[] {
        const buckets = [];

        for (let index = 0; index < results.rowCount; ++index) {
            buckets.push(new Bucket(bot, results.rows[index]));
        }

        return buckets;
    }

    private static determineIsBucketValid(bot : DiscordIOClient, dbRow : any) : boolean {
        const server = bot.servers[dbRow.server_id];
        if (!server) {
            return false;
        }

        if (!(dbRow.channel_id in server.channels)) {
            return false;
        }

        if (dbRow.required_role_id) {
            if (!(dbRow.required_role_id in server.roles)) {
                return false;
            }
        }

        return true;
    }

    async setIsPaused(db : Database, isPaused : boolean) {
        const results = await db.query('UPDATE prompt_buckets SET is_paused = $1 WHERE bucket_id = $2', [(isPaused ? 1 : 0), this.id]);
        if (results.rowCount === 0) {
            throw new Error('Unable to update the status of the prompt bucket in the database.');
        }

        assert(results.rowCount === 1);
    }

    isFrequencyMet(lastDate : Date, currentDate : Date) : boolean {
        switch (this.frequency) {
            case BucketFrequency.Daily:
                return !BotUtils.isSameDay(lastDate, currentDate);
            case BucketFrequency.Weekly:
                return (moment(lastDate).format('W') !== moment(currentDate).format('W'));
            case BucketFrequency.Monthly:
                return (lastDate.getUTCMonth() !== currentDate.getUTCMonth());
            case BucketFrequency.Yearly:
                return (lastDate.getUTCFullYear() !== currentDate.getUTCFullYear());
            case BucketFrequency.Immediately:
                return false;
            default:
                throw 'Unrecognized frequency type: \'' + this.frequency + '\'';
        }
    }
}
