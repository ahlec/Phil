import { Client as DiscordIOClient, Server as DiscordIOServer } from 'discord.io';
import Database from './database';
import Phil from './phil';
import ServerConfig from './server-config';
import BotUtils from './utils';

const assert = require('assert');
const moment = require('moment');

export enum BucketFrequency {
    Daily = 0,
    Weekly = 1,
    Immediately = 2
}

const frequencyDisplayStrings = {
    [BucketFrequency.Daily]: 'Daily',
    [BucketFrequency.Weekly]: 'Weekly',
    [BucketFrequency.Immediately]: 'Immediately'
};

const frequencyFromStrings: { [name: string]: BucketFrequency } = {
    'daily': BucketFrequency.Daily,
    'immediately': BucketFrequency.Immediately,
    'weekly': BucketFrequency.Weekly
};

function throwMultipleUnspecifiedBucketsError(serverConfig: ServerConfig, serverBuckets: Bucket[], commandName: string) {
    if (serverBuckets.length === 0) {
        throw new Error('There are no prompt buckets configured on this server.');
    }

    let message = 'This command must be provided the valid reference handle of one of the buckets configured on this server:\n\n';

    for (const bucket of serverBuckets) {
        message += '`' + bucket.handle + '` - ' + bucket.displayName + ' (';

        if (bucket.isValid) {
            message += 'posts to <#' + bucket.channelId + '>';
        } else {
            message += 'configuration invalid';
        }

        message += ')\n';
    }

    const randomBucket = BotUtils.getRandomArrayEntry(serverBuckets);
    message += '\nPlease try the command once more, specifying which bucket, like `' + serverConfig.commandPrefix + commandName + ' ' + randomBucket.handle + '`.';
    throw new Error(message);
}

function getOnlyBucketOnServer(serverConfig: ServerConfig, serverBuckets: Bucket[], commandName: string, allowInvalidServers: boolean): Bucket {
    if (serverBuckets.length === 1 && (allowInvalidServers || serverBuckets[0].isValid)) {
        return serverBuckets[0];
    }

    throwMultipleUnspecifiedBucketsError(serverConfig, serverBuckets, commandName);
}

export default class Bucket {
    public static async getFromId(bot: DiscordIOClient, db: Database, bucketId: number): Promise<Bucket> {
        const results = await db.query('SELECT * FROM prompt_buckets WHERE bucket_id = $1', [bucketId]);
        if (results.rowCount === 0) {
            return null;
        }

        assert(results.rowCount === 1);
        return new Bucket(bot, results.rows[0]);
    }

    public static async getFromChannelId(bot: DiscordIOClient, db: Database, channelId: string): Promise<Bucket> {
        const results = await db.query('SELECT * FROM prompt_buckets WHERE channel_id = $1', [channelId]);
        if (results.rowCount === 0) {
            return null;
        }

        assert(results.rowCount === 1);
        return new Bucket(bot, results.rows[0]);
    }

    public static async getFromReferenceHandle(bot: DiscordIOClient, db: Database, server: DiscordIOServer, referenceHandle: string): Promise<Bucket> {
        const results = await db.query('SELECT * FROM prompt_buckets WHERE server_id = $1 AND reference_handle = $2', [server.id, referenceHandle]);
        if (results.rowCount === 0) {
            return null;
        }

        assert(results.rowCount === 1);
        return new Bucket(bot, results.rows[0]);
    }

    public static async getAllForServer(bot: DiscordIOClient, db: Database, serverId: string): Promise<Bucket[]> {
        const results = await db.query('SELECT * FROM prompt_buckets WHERE server_id = $1', [serverId]);
        return results.rows.map(row => new Bucket(bot, row));
    }

    public static async retrieveFromCommandArgs(phil: Phil, commandArgs: ReadonlyArray<string>, serverConfig: ServerConfig, commandName: string, allowInvalidServers: boolean): Promise<Bucket> {
        const firstParameter = commandArgs[0];
        if (!firstParameter || firstParameter.length === 0) {
            const serverBuckets = await Bucket.getAllForServer(phil.bot, phil.db, serverConfig.server.id);
            return getOnlyBucketOnServer(serverConfig, serverBuckets, commandName, allowInvalidServers);
        }

        const bucket = await Bucket.getFromReferenceHandle(phil.bot, phil.db, serverConfig.server, firstParameter);
        if (bucket === null || (!allowInvalidServers && !bucket.isValid)) {
            const serverBuckets = await Bucket.getAllForServer(phil.bot, phil.db, serverConfig.server.id);
            throwMultipleUnspecifiedBucketsError(serverConfig, serverBuckets, commandName);
        }

        return bucket;
    }

    private static determineIsBucketValid(bot: DiscordIOClient, dbRow: any): boolean {
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

    public readonly id: number;
    public readonly serverId: string;
    public readonly channelId: string;
    public readonly isValid: boolean;
    public readonly handle: string;
    public readonly displayName: string;
    public readonly isPaused: boolean;
    public readonly requiredRoleId?: string;
    public readonly alertWhenLow: boolean;
    public readonly frequency: BucketFrequency;
    public readonly frequencyDisplayName: string;
    public readonly promptTitleFormat: string;

    private constructor(bot : DiscordIOClient, dbRow : any) {
        const isValid = Bucket.determineIsBucketValid(bot, dbRow);
        const bucketFrequency = frequencyFromStrings[dbRow.frequency];
        assert(bucketFrequency !== undefined && bucketFrequency !== null);

        this.id = parseInt(dbRow.bucket_id, 10);
        this.serverId = dbRow.server_id;
        this.channelId = dbRow.channel_id;
        this.isValid = isValid;
        this.handle = dbRow.reference_handle;
        this.displayName = dbRow.display_name;
        this.isPaused = (parseInt(dbRow.is_paused, 10) === 1);
        this.requiredRoleId = dbRow.required_role_id;
        this.alertWhenLow = (parseInt(dbRow.alert_when_low, 10) === 1);
        this.frequency = bucketFrequency;
        this.frequencyDisplayName = frequencyDisplayStrings[bucketFrequency];
        this.promptTitleFormat = dbRow.prompt_title_format;
    }

    public async setIsPaused(db: Database, isPaused: boolean) {
        const results = await db.query('UPDATE prompt_buckets SET is_paused = $1 WHERE bucket_id = $2', [(isPaused ? 1 : 0), this.id]);
        if (results.rowCount === 0) {
            throw new Error('Unable to update the status of the prompt bucket in the database.');
        }

        assert(results.rowCount === 1);
    }

    public isFrequencyMet(lastDate: Date, currentDate: Date): boolean {
        switch (this.frequency) {
            case BucketFrequency.Daily:
                return !BotUtils.isSameDay(lastDate, currentDate);
            case BucketFrequency.Weekly:
                return (moment(lastDate).format('W') !== moment(currentDate).format('W'));
            case BucketFrequency.Immediately:
                return false;
            default:
                throw new Error('Unrecognized frequency type: \'' + this.frequency + '\'');
        }
    }

    public convertPromptQueueLengthToDays(queueLength: number): number {
        switch (this.frequency) {
            case BucketFrequency.Daily:
                return queueLength;
            case BucketFrequency.Weekly:
                return queueLength * 7;
            case BucketFrequency.Immediately:
                return 0;
            default:
                throw new Error('Unrecognized frequency type: \'' + this.frequency + '\'');
        }
    }

    public canUserSubmitTo(bot: DiscordIOClient, userId: string): boolean {
        if (!this.requiredRoleId) {
            return true;
        }

        const server = bot.servers[this.serverId];
        const member = server.members[userId];
        if (member.roles.includes(this.requiredRoleId)) {
            return true;
        }

        return false;
    }
}
