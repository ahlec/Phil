import EmbedColor from '../embed-color';
import PrivateMessage from '../messages/private';
import Phil from '../phil';
import { sendEmbedMessage } from '@phil/promises/discord';
import SubmissionSession from '../prompts/submission-session';
import SuggestSessionReactableFactory from '../reactables/suggest-session/factory';
import { DirectMessageProcessor, ProcessorActiveToken } from './@base';

type PromptValidateResult =
  | { isValid: true; validatedMessage: string }
  | { isValid: false; invalidReason: string };

function validatePromptSubmission(message: string): PromptValidateResult {
  if (!message) {
    return {
      invalidReason: 'The input was just an empty message.',
      isValid: false,
    };
  }

  message = message.trim();

  return { isValid: true, validatedMessage: message };
}

interface SuggestSessionListenerToken extends ProcessorActiveToken {
  readonly currentSession?: SubmissionSession;
}

export default class SuggestSessionListener implements DirectMessageProcessor {
  public readonly handle = 'suggest-session-listener';

  public async canProcess(
    phil: Phil,
    message: PrivateMessage
  ): Promise<SuggestSessionListenerToken> {
    const currentSession = await SubmissionSession.getActiveSession(
      phil,
      message.userId
    );
    if (!currentSession) {
      return {
        isActive: false,
      };
    }

    return {
      currentSession,
      isActive: true,
    };
  }

  public async process(
    phil: Phil,
    message: PrivateMessage,
    rawToken: ProcessorActiveToken
  ): Promise<void> {
    const token = rawToken as SuggestSessionListenerToken;
    const validationResults = validatePromptSubmission(message.content);
    if (!validationResults.isValid || !token.currentSession) {
      // TODO
      return;
    }

    await token.currentSession.submit(phil, validationResults.validatedMessage);

    const NOWRAP = '';
    const numSubmissions = token.currentSession.getNumberSubmissions();
    const messageId = await sendEmbedMessage(phil.bot, message.channelId, {
      color: EmbedColor.Info,
      description: `**${validationResults.validatedMessage}** has been sent to the admins ${NOWRAP}for approval.`,
      footer: {
        text: `You have made ${numSubmissions} submission${
          numSubmissions !== 1 ? 's' : ''
        } during this session.`,
      },
      title: ':pencil: Prompt Received :incoming_envelope:',
    });

    const reactableFactory = new SuggestSessionReactableFactory(
      phil.bot,
      phil.db,
      {
        canMakeAnonymous: false,
        channelId: message.channelId,
        messageId,
        timeLimit: token.currentSession.remainingTime.asMinutes(),
        user: message.user,
      }
    );
    await reactableFactory.create();
  }
}
