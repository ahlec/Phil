'use strict';

import { Command } from './@types';
import { Phil } from '../phil/phil';
import { HelpGroup } from '../phil/help-groups';
import { DiscordMessage } from '../phil/discord-message';
import { DiscordPromises } from '../promises/discord';
import { Features } from '../phil/features';
import { Bucket } from '../phil/buckets';
import { Prompt } from '../phil/prompts/prompt';

const MAX_LIST_LENGTH = 10;

export class UnconfirmedCommand implements Command {
    readonly name = 'unconfirmed';
    readonly aliases : string[] = [];
    readonly feature = Features.Prompts;

    readonly helpGroup = HelpGroup.Prompts;
    readonly helpDescription = 'Creates a list of some of the unconfirmed prompts that are awaiting admin approval before being added to the prompt queue.';

    readonly versionAdded = 1;

    readonly publicRequiresAdmin = true;
    async processPublicMessage(phil : Phil, message : DiscordMessage, commandArgs : string[]) : Promise<any> {
        await phil.db.query('DELETE FROM prompt_confirmation_queue WHERE channel_id = $1', [message.channelId]);
        const bucket = await Bucket.retrieveFromCommandArgs(phil.bot, phil.db, commandArgs, message.server, 'unconfirmed', false);

        const prompts = await Prompt.getUnconfirmedPrompts(phil.bot, phil.db, bucket, MAX_LIST_LENGTH);
        if (prompts.length === 0) {
            return this.outputNoUnconfirmedPrompts(phil, message.channelId);
        }

        for (let index = 0; index < prompts.length; ++index) {
            let prompt = prompts[index];
            await phil.db.query('INSERT INTO prompt_confirmation_queue VALUES($1, $2, $3)', [message.channelId, prompt.promptId, index]);
        }

        return this.outputList(phil, message.channelId, prompts);
    }

    private outputNoUnconfirmedPrompts(phil : Phil, channelId : string) : Promise<string> {
        return DiscordPromises.sendMessage(phil.bot, channelId, ':large_blue_diamond: There are no unconfirmed prompts in the queue right now.');
    }

    private outputList(phil : Phil, channelId : string, prompts : Prompt[]) : Promise<string> {
        const existenceVerb = (prompts.length === 1 ? 'is' : 'are');
        const noun = (prompts.length === 1 ? 'prompt' : 'prompts');
        var message = ':pencil: Here ' + existenceVerb + ' ' + prompts.length + ' unconfirmed ' + noun + '.';

        for (let index = 0; index < prompts.length; ++index) {
            message += '\n        `' + (index + 1) + '`: "' + prompts[index].text + '"';
        }

        message += '\nConfirm prompts with `' + process.env.COMMAND_PREFIX + 'confirm`. You can specify a single prompt by using its number (`';
        message += process.env.COMMAND_PREFIX + 'confirm 3`) or a range of prompts using a hyphen (`' + process.env.COMMAND_PREFIX + 'confirm 2-7`)';

        return DiscordPromises.sendMessage(phil.bot, channelId, message);
    }
};
