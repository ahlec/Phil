import { DirectMessageProcessor, IProcessorActiveToken } from './@base';
import { Phil } from '../phil/phil';
import { IPrivateMessage } from 'phil';
import { DiscordPromises } from '../promises/discord';
import SubmissionSession from '../phil/prompts/submission-session';
import SuggestSessionReactableFactory from '../phil/reactables/suggest-session/factory';

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

interface SuggestSessionListenerToken extends IProcessorActiveToken {
    readonly currentSession? : SubmissionSession;
}

export default class SuggestSessionListener implements DirectMessageProcessor {
    readonly handle = 'suggest-session-listener';

    async canProcess(phil: Phil, message: IPrivateMessage): Promise<SuggestSessionListenerToken> {
        const currentSession = await SubmissionSession.getActiveSession(phil, message.userId);
        if (!currentSession) {
            return {
                isActive: false
            };
        }

        return {
            isActive: true,
            currentSession
        }
    }

    async process(phil: Phil, message: IPrivateMessage, rawToken: IProcessorActiveToken) {
        const token = rawToken as SuggestSessionListenerToken;
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
            title: ':pencil: Prompt Received :incoming_envelope:',
            description: `**${validationResults.validatedMessage}** has been sent to the admins ${
                NOWRAP}for approval.`,
            footer: {
                text: `You have made ${numSubmissions} submission${
                    numSubmissions !== 1 ? 's' : ''} during this session.`
            }
        });

        const reactableFactory = new SuggestSessionReactableFactory(phil.bot, phil.db, {
            messageId: messageId,
            channelId: message.channelId,
            user: message.user,
            timeLimit: token.currentSession.remainingTime.asMinutes(),
            canMakeAnonymous: false
        });
        await reactableFactory.create();
    }
}
