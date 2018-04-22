'use strict';

import { Command } from './@types';
import { HelpGroup } from '../phil/help-groups';
import { Client as DiscordIOClient } from 'discord.io';
import { DiscordMessage } from '../phil/discord-message';
import { Database } from '../phil/database';
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
    async processPublicMessage(bot : DiscordIOClient, message : DiscordMessage, commandArgs : string[], db : Database) : Promise<any> {
        const bucket = await Bucket.getFromChannelId(bot, db, message.channelId);
        if (!bucket) {
            throw new Error('This channel is not configured to work with prompts.');
        }

        const prompt = await Prompt.getCurrentPrompt(bot, db, bucket);
        if (!prompt) {
            throw new Error('There\'s no prompt right now. That probably means that I\'m out of them! Why don\'t you suggest more by sending me `' + process.env.COMMAND_PREFIX + 'suggest` and including your prompt?');
        }

        prompt.sendToChannel(bot, message.channelId, bucket, prompt.promptNumber);
    }
};
