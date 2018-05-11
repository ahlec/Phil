'use strict';

import { Command } from './@types';
import { Phil } from '../phil/phil';
import { HelpGroup } from '../phil/help-groups';
import { DiscordMessage } from '../phil/discord-message';
import { Database } from '../phil/database';
import { BotUtils } from '../phil/utils';
import { DiscordPromises } from '../promises/discord';
import { Features } from '../phil/features';
import { Bucket } from '../phil/buckets';

interface FieldTransformFunc<T> {
    (bucket : Bucket, value : T) : string;
}

function createField<T>(bucket : Bucket, header : string, value : T, valueTransformFunc? : FieldTransformFunc<T>) {
    var displayValue : any = value;
    if (valueTransformFunc) {
        displayValue = valueTransformFunc(bucket, value);
    }

    return {
        name: header,
        value: displayValue,
        inline: true
    };
}

function formatBoolean(bucket : Bucket, value : boolean) : string {
    return (value ? 'Yes' : 'No');
}

function formatChannel(bucket : Bucket, value : string) : string {
    return '<#' + value + '>';
}

function sendBucketToChannel(phil : Phil, channelId : string, bucket : Bucket) : Promise<string> {
    return DiscordPromises.sendEmbedMessage(phil.bot, channelId, {
        color: 0xB0E0E6,
        title: ':writing_hand: Prompt Bucket: ' + bucket.handle,
        fields: [
            createField(bucket, 'Reference Handle', bucket.handle),
            createField(bucket, 'Display Name', bucket.displayName),
            createField(bucket, 'Database ID', bucket.id),
            createField(bucket, 'Is Valid', bucket.isValid, formatBoolean),
            createField(bucket, 'Channel', bucket.channelId, formatChannel),
            createField(bucket, 'Required Member Role', (bucket.requiredRoleId ? '<@' + bucket.requiredRoleId + '>' : 'None')),
            createField(bucket, 'Is Paused', bucket.isPaused, formatBoolean),
            createField(bucket, 'Should Pin Posts', bucket.shouldPinPosts, formatBoolean),
            createField(bucket, 'Frequency', bucket.frequencyDisplayName)
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
    async processPublicMessage(phil : Phil, message : DiscordMessage, commandArgs : string[]) : Promise<any> {
        const bucket = await Bucket.retrieveFromCommandArgs(phil, commandArgs, message.serverConfig, 'bucket', true);
        return sendBucketToChannel(phil, message.channelId, bucket);
    }
};
