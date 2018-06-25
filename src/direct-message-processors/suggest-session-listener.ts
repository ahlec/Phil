import PrivateMessage from 'messages/private';
import Phil from 'phil';
import { DiscordPromises } from 'promises/discord';
import SubmissionSession from 'prompts/submission-session';
import SuggestSessionReactableFactory from 'reactables/suggest-session/factory';
import { IDirectMessageProcessor, IProcessorActiveToken } from './@base';

interface IPromptValidateResult {
    isValid: boolean;
    invalidReason?: string;
    validatedMessage?: string;
}

function validatePromptSubmission(message: string): IPromptValidateResult {
    if (!message) {
        return {isValid: false, invalidReason: 'The input was just an empty message.'};
    }

    message = message.trim();

    return {isValid: true, validatedMessage: message};
}

interface ISuggestSessionListenerToken extends IProcessorActiveToken {
    readonly currentSession?: SubmissionSession;
}

export default class SuggestSessionListener implements IDirectMessageProcessor {
    public readonly handle = 'suggest-session-listener';

    public async canProcess(phil: Phil, message: PrivateMessage): Promise<ISuggestSessionListenerToken> {
        const currentSession = await SubmissionSession.getActiveSession(phil, message.userId);
        if (!currentSession) {
            return {
                isActive: false
            };
        }

        return {
            currentSession,
            isActive: true
        }
    }

    public async process(phil: Phil, message: PrivateMessage, rawToken: IProcessorActiveToken) {
        const token = rawToken as ISuggestSessionListenerToken;
        const validationResults = validatePromptSubmission(message.content);
        if (!validationResults.isValid) {
            // TODO
            return;
        }

        await token.currentSession.submit(phil, validationResults.validatedMessage);

        const NOWRAP = '';
        const numSubmissions = token.currentSession.getNumberSubmissions();
        const messageId = await DiscordPromises.sendEmbedMessage(phil.bot, message.channelId, {
            color: 0xB0E0E6,
            description: `**${validationResults.validatedMessage}** has been sent to the admins ${
                NOWRAP}for approval.`,
            footer: {
                text: `You have made ${numSubmissions} submission${
                    numSubmissions !== 1 ? 's' : ''} during this session.`
            },
            title: ':pencil: Prompt Received :incoming_envelope:'
        });

        const reactableFactory = new SuggestSessionReactableFactory(phil.bot, phil.db, {
            canMakeAnonymous: false,
            channelId: message.channelId,
            messageId,
            timeLimit: token.currentSession.remainingTime.asMinutes(),
            user: message.user,
        });
        await reactableFactory.create();
    }
}
