import Phil from '../phil';
import ServerConfig from '../server-config';
import ConfirmRejectCommandBase from './bases/confirm-reject-base';

const successMessageEnd = ' rejected. You may continue using `{commandPrefix}reject` or start over by using `{commandPrefix}unconfirmed`.';

export default class RejectCommand extends ConfirmRejectCommandBase {
    public readonly name = 'reject';
    public readonly aliases : string[] = [];

    public readonly versionAdded = 1;

    protected readonly noPromptsConfirmedMessage = 'No prompts were rejected. This is probably because they were already rejected. You can start over by using `{commandPrefix}unconfirmed` to see all of the still-unconfirmed prompts.';
    protected readonly onePromptConfirmedMessage = 'Prompt was' + successMessageEnd;
    protected readonly multiplePromptsConfirmedMessage = 'Prompts were' + successMessageEnd;

    protected async performActionOnPrompt(phil: Phil, serverConfig: ServerConfig, promptId: number): Promise<boolean> {
        await phil.db.query('DELETE FROM prompts WHERE prompt_id = $1', [promptId]);
        return true;
    }
};
