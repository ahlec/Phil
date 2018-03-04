'use strict';

import { ConfirmRejectCommandBase } from './bases/confirm-reject-base';
import { Client as DiscordIOClient } from 'discord.io';
import { Database } from '../phil/database';
import { Bucket, BucketFrequency } from '../phil/buckets';
import { Prompt } from '../phil/prompts';

const successMessageEnd = ' confirmed. You may continue using `' + process.env.COMMAND_PREFIX + 'confirm` or start over by using `' + process.env.COMMAND_PREFIX + 'unconfirmed`.';

export class ConfirmCommand extends ConfirmRejectCommandBase {
    protected readonly noPromptsConfirmedMessage = 'No prompts were confirmed. This is probably because they were already confirmed. You can start over by using `' + process.env.COMMAND_PREFIX + 'unconfirmed` to see all of the still-unconfirmed prompts.';
    protected readonly onePromptConfirmedMessage = 'Prompt was' + successMessageEnd;
    protected readonly multiplePromptsConfirmedMessage = 'Prompts were' + successMessageEnd;

    readonly name = 'confirm';
    readonly aliases : string[] = [];

    readonly versionAdded = 1;

    protected async performActionOnPrompt(bot : DiscordIOClient, db : Database, promptId : number) : Promise<boolean> {
        const bucketLookupResults = await db.query('SELECT bucket_id FROM prompts WHERE prompt_id = $1', [promptId]);
        if (!bucketLookupResults || bucketLookupResults.rowCount === 0) {
            return false;
        }
        const bucket = await Bucket.getFromId(bot, db, bucketLookupResults.rows[0].bucket_id);

        await db.query('UPDATE prompts SET approved_by_admin = E\'1\' WHERE prompt_id = $1', [promptId]);
        if (bucket.frequency !== BucketFrequency.Immediately) {
            return true;
        }

        const prompt = await Prompt.getFromId(bot, db, promptId);
        await prompt.postAsNewPrompt(bot, db, new Date());
        return true;
    }
};
