'use strict';

import { ConfirmRejectCommandBase } from './bases/confirm-reject-base';
import { Client as DiscordIOClient } from 'discord.io';
import { Database } from '../phil/database';
import { Prompt } from '../phil/prompts/prompt';

const successMessageEnd = ' rejected. You may continue using `' + process.env.COMMAND_PREFIX + 'reject` or start over by using `' + process.env.COMMAND_PREFIX + 'unconfirmed`.';

export class RejectCommand extends ConfirmRejectCommandBase {
    protected readonly noPromptsConfirmedMessage = 'No prompts were rejected. This is probably because they were already rejected. You can start over by using `' + process.env.COMMAND_PREFIX + 'unconfirmed` to see all of the still-unconfirmed prompts.';
    protected readonly onePromptConfirmedMessage = 'Prompt was' + successMessageEnd;
    protected readonly multiplePromptsConfirmedMessage = 'Prompts were' + successMessageEnd;

    readonly name = 'reject';
    readonly aliases : string[] = [];

    readonly versionAdded = 1;

    protected async performActionOnPrompt(bot : DiscordIOClient, db : Database, promptId : number) : Promise<boolean> {
        await db.query('DELETE FROM prompts WHERE prompt_id = $1', [promptId]);
        return true;
    }
};
