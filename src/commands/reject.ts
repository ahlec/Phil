'use strict';

import { ConfirmRejectCommandBase } from './bases/confirm-reject-base';
import { Phil } from '../phil/phil';
import { Prompt } from '../phil/prompts/prompt';
import { ServerConfig } from '../phil/server-config';

const successMessageEnd = ' rejected. You may continue using `{commandPrefix}reject` or start over by using `{commandPrefix}unconfirmed`.';

export class RejectCommand extends ConfirmRejectCommandBase {
    protected readonly noPromptsConfirmedMessage = 'No prompts were rejected. This is probably because they were already rejected. You can start over by using `{commandPrefix}unconfirmed` to see all of the still-unconfirmed prompts.';
    protected readonly onePromptConfirmedMessage = 'Prompt was' + successMessageEnd;
    protected readonly multiplePromptsConfirmedMessage = 'Prompts were' + successMessageEnd;

    readonly name = 'reject';
    readonly aliases : string[] = [];

    readonly versionAdded = 1;

    protected async performActionOnPrompt(phil : Phil, serverConfig : ServerConfig, promptId : number) : Promise<boolean> {
        await phil.db.query('DELETE FROM prompts WHERE prompt_id = $1', [promptId]);
        return true;
    }
};
