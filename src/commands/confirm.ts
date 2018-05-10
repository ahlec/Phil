'use strict';

import { ConfirmRejectCommandBase } from './bases/confirm-reject-base';
import { Phil } from '../phil/phil';
import { Database } from '../phil/database';
import { Bucket, BucketFrequency } from '../phil/buckets';
import { Prompt } from '../phil/prompts/prompt';

const successMessageEnd = ' confirmed. You may continue using `' + process.env.COMMAND_PREFIX + 'confirm` or start over by using `' + process.env.COMMAND_PREFIX + 'unconfirmed`.';

export class ConfirmCommand extends ConfirmRejectCommandBase {
    protected readonly noPromptsConfirmedMessage = 'No prompts were confirmed. This is probably because they were already confirmed. You can start over by using `' + process.env.COMMAND_PREFIX + 'unconfirmed` to see all of the still-unconfirmed prompts.';
    protected readonly onePromptConfirmedMessage = 'Prompt was' + successMessageEnd;
    protected readonly multiplePromptsConfirmedMessage = 'Prompts were' + successMessageEnd;

    readonly name = 'confirm';
    readonly aliases : string[] = [];

    readonly versionAdded = 1;

    protected async performActionOnPrompt(phil : Phil, promptId : number) : Promise<boolean> {
        const bucketLookupResults = await phil.db.query('SELECT bucket_id FROM prompts WHERE prompt_id = $1', [promptId]);
        if (!bucketLookupResults || bucketLookupResults.rowCount === 0) {
            return false;
        }
        const bucket = await Bucket.getFromId(phil.bot, phil.db, bucketLookupResults.rows[0].bucket_id);

        await phil.db.query('UPDATE prompts SET approved_by_admin = E\'1\' WHERE prompt_id = $1', [promptId]);
        if (bucket.frequency !== BucketFrequency.Immediately) {
            return true;
        }

        const prompt = await Prompt.getFromId(phil.bot, phil.db, promptId);
        await prompt.postAsNewPrompt(phil.bot, phil.db, new Date());
        return true;
    }
};
