'use strict';

import { Command } from '../@types';
import { HelpGroup } from '../../phil/help-groups';
import { Client as DiscordIOClient } from 'discord.io';
import { DiscordMessage } from '../../phil/discord-message';
import { Database } from '../../phil/database';
import { Features } from '../../phil/features';
import { DiscordPromises } from '../../promises/discord';
import { Bucket } from '../../phil/buckets';

interface Suggestion {
    readonly bucket : Bucket;
    readonly prompt : string;
}

interface ServerBucketLookup {
    [serverId : string] : Bucket[];
}

export abstract class SuggestCommandBase implements Command {
    protected abstract readonly suggestAnonymously : boolean;

    abstract readonly name : string;
    abstract readonly aliases : string[];
    readonly feature = Features.Prompts;

    readonly helpGroup = HelpGroup.Prompts;
    abstract readonly helpDescription : string;

    abstract readonly versionAdded : number;

    readonly privateRequiresAdmin = false;
    async processPrivateMessage(bot : DiscordIOClient, message : DiscordMessage, commandArgs : string[], db : Database) : Promise<any> {
        const userBuckets = await Bucket.getAllForUser(bot, db, message.userId);
        const bucket = this.resolveBucket(bot, userBuckets, commandArgs);
        if (!bucket.canUserSubmitTo(bot, message.userId)) {
            const role = message.server.roles[bucket.requiredRoleId];
            throw new Error('In order to be able to submit a prompt to this bucket, you must have the **' + role.name + '** role.');
        }

        const suggestion = this.getSuggestionFromCommandArgs(commandArgs, bucket);
        await this.addNewPrompt(db, message.user.username, message.userId, suggestion);

        return this.sendConfirmationMessage(bot, message.channelId, suggestion);
    }

    private resolveBucket(bot : DiscordIOClient, userBuckets : Bucket[], commandArgs : string[]) : Bucket {
        if (!userBuckets || userBuckets.length === 0) {
            throw new Error('There are no prompt buckets that you are able to submit to. This most likely means that you are not part of any servers with configured prompt buckets. However, if you do know that there are prompt buckets on one (or more) servers, reach out to your admin(s); it could be that you are lacking the appropriate roles, or that prompts are temporarily disabled on that server.');
        }

        if (userBuckets.length === 1) {
            return userBuckets[0];
        }

        if (commandArgs.length === 0) {
            throw new Error('You did not specify a prompt bucket to suggest something to (nor did you suggest anything at all!). Please try again, but specify both the bucket you\'d like to submit to as well as the prompt that you would like to submit.');
        }

        const bucketHandle = commandArgs[0];
        const serverLookup : ServerBucketLookup = {};
        for (let bucket of userBuckets) {
            if (bucket.handle.toLowerCase() === bucketHandle.toLowerCase()) {
                return bucket;
            }

            if (!serverLookup[bucket.serverId]) {
                serverLookup[bucket.serverId] = [];
            }

            serverLookup[bucket.serverId].push(bucket);
        }

        const errorList = this.createBucketErrorList(bot, serverLookup);
        throw new Error(errorList);
    }

    private createBucketErrorList(bot : DiscordIOClient, serverLookup : ServerBucketLookup) : string {
        var message = 'In order to use this command, you must specify the name of a bucket. Within the following servers that we\'re both in, here are the buckets you can submit to:';

        var firstBucket;
        for (let serverId in serverLookup) {
            let server = bot.servers[serverId];
            if (!server) {
                continue;
            }

            let serverBuckets = serverLookup[serverId];
            message += '\n\n**' + server.name + '** (' + serverBuckets.length + ' bucket';
            if (serverBuckets.length !== 1) {
                message += 's';
            }
            message += '):';

            for (let bucket of serverBuckets) {
                if (!firstBucket) {
                    firstBucket = bucket;
                }

                message += '\n\t`' + bucket.handle + '` - **' + bucket.displayName + '**';
            }
        }

        message += '\n\nIn order to specify a bucket, the reference handle should be the first thing you type after the command. For example, `' + process.env.COMMAND_PREFIX + this.name + ' ' + firstBucket.handle + '`.';
        return message;
    }

    private getSuggestionFromCommandArgs(commandArgs : string[], bucket : Bucket) : Suggestion {
        var unusedArgs = commandArgs;
        if (commandArgs.length > 0 && commandArgs[0].toLowerCase() === bucket.handle.toLowerCase()) {
            unusedArgs = unusedArgs.slice(1);
        }

        const prompt = unusedArgs.join(' ').trim().replace(/`/g, '');
        if (prompt.length === 0) {
            throw new Error('You must provide a prompt to suggest!');
        }

        return {
            bucket: bucket,
            prompt: prompt
        };
    }

    private addNewPrompt(db : Database, username : string, userId : string, suggestion : Suggestion) : Promise<any> {
        var suggestBit = (this.suggestAnonymously ? 1 : 0);
        return db.query(`INSERT INTO
                prompts(suggesting_user, suggesting_userid, date_suggested, prompt_text, submitted_anonymously, bucket_id)
                VALUES($1, $2, CURRENT_TIMESTAMP, $3, $4, $5)`,
                [username, userId, suggestion.prompt, suggestBit, suggestion.bucket.id]);
    }

    private sendConfirmationMessage(bot : DiscordIOClient, channelId : string, suggestion : Suggestion) : Promise<string> {
        return DiscordPromises.sendEmbedMessage(bot, channelId, {
            color: 0xB0E0E6,
            title: ':envelope_with_arrow: Submission Received',
            description: 'The following prompt has been sent to the admins for approval:\n\n**' + suggestion.prompt + '**\n\nIf it\'s approved, you\'ll see it in chat shortly and you\'ll receive a point for the leaderboard!'
        });
    }
}
