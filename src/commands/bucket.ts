'use strict';

import { Command } from './@types';
import { HelpGroup } from '../phil/help-groups';
import { Client as DiscordIOClient } from 'discord.io';
import { DiscordMessage } from '../phil/discord-message';
import { Database } from '../phil/database';
import { BotUtils } from '../phil/utils';
import { DiscordPromises } from '../promises/discord';
import { Features } from '../phil/features';
import { Bucket } from '../phil/buckets';

interface FieldTransformFunc<T> {
    (bot : DiscordIOClient, bucket : Bucket, value : T) : string;
}

function createField<T>(bot : DiscordIOClient, bucket : Bucket, header : string, value : T, valueTransformFunc? : FieldTransformFunc<T>) {
    var displayValue : any = value;
    if (valueTransformFunc) {
        displayValue = valueTransformFunc(bot, bucket, value);
    }

    return {
        name: header,
        value: displayValue,
        inline: true
    };
}

function formatBoolean(bot : DiscordIOClient, bucket : Bucket, value : boolean) : string {
    return (value ? 'Yes' : 'No');
}

function formatChannel(bot : DiscordIOClient, bucket : Bucket, value : string) : string {
    return '<#' + value + '>';
}

function sendBucketToChannel(bot : DiscordIOClient, channelId : string, bucket : Bucket) : Promise<string> {
    return DiscordPromises.sendEmbedMessage(bot, channelId, {
        color: 0xB0E0E6,
        title: ':writing_hand: Prompt Bucket: ' + bucket.handle,
        fields: [
            createField(bot, bucket, 'Reference Handle', bucket.handle),
            createField(bot, bucket, 'Display Name', bucket.displayName),
            createField(bot, bucket, 'Database ID', bucket.id),
            createField(bot, bucket, 'Is Valid', bucket.isValid, formatBoolean),
            createField(bot, bucket, 'Channel', bucket.channelId, formatChannel),
            createField(bot, bucket, 'Required Member Role', (bucket.requiredRoleId ? '<@' + bucket.requiredRoleId + '>' : 'None')),
            createField(bot, bucket, 'Is Paused', bucket.isPaused, formatBoolean),
            createField(bot, bucket, 'Should Pin Posts', bucket.shouldPinPosts, formatBoolean),
            createField(bot, bucket, 'Frequency', bucket.frequencyDisplayName)
        ]
    });
}

export class BucketCommand implements Command {
    readonly name = 'bucket';
    readonly aliases : string[] = [];
    readonly feature = Features.Prompts;

    readonly helpGroup = HelpGroup.Prompts;
    readonly helpDescription = 'Displays all of the configuration information for a prompt bucket.';

    readonly versionAdded = 11;

    readonly publicRequiresAdmin = true;
    async processPublicMessage(bot : DiscordIOClient, message : DiscordMessage, commandArgs : string[], db : Database) : Promise<any> {
        const bucket = await Bucket.retrieveFromCommandArgs(bot, db, commandArgs, message.server, 'bucket', true);
        return sendBucketToChannel(bot, message.channelId, bucket);
    }
};
