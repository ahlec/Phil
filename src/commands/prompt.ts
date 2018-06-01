'use strict';

import { Command } from './@types';
import { Phil } from '../phil/phil';
import { HelpGroup } from '../phil/help-groups';
import { IPublicMessage } from 'phil';
import { BotUtils } from '../phil/utils';
import { Features } from '../phil/features';
import { Bucket } from '../phil/buckets';
import { Prompt } from '../phil/prompts/prompt';

export class PromptCommand implements Command {
    readonly name = 'prompt';
    readonly aliases : string[] = [];
    readonly feature = Features.Prompts;

    readonly helpGroup = HelpGroup.Prompts;
    readonly helpDescription = 'Asks Phil to remind you what the prompt of the day is.';

    readonly versionAdded = 3;

    readonly publicRequiresAdmin = false;
    async processPublicMessage(phil : Phil, message : IPublicMessage, commandArgs : string[]) : Promise<any> {
        const bucket = await Bucket.getFromChannelId(phil.bot, phil.db, message.channelId);
        if (!bucket) {
            throw new Error('This channel is not configured to work with prompts.');
        }

        const prompt = await Prompt.getCurrentPrompt(phil, bucket);
        if (!prompt) {
            throw new Error('There\'s no prompt right now. That probably means that I\'m out of them! Why don\'t you suggest more by sending me `' + message.serverConfig.commandPrefix + 'suggest` and including your prompt?');
        }

        prompt.sendToChannel(phil, message.serverConfig, message.channelId, bucket, prompt.promptNumber);
    }
};
