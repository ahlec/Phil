import PrivateMessage from '@phil/messages/private';
import Phil from '@phil/phil';
import SubmissionSession from '@phil/prompts/submission-session';
import SuggestSessionReactableFactory from '@phil/reactables/suggest-session/factory';
import { DirectMessageProcessor, ProcessorActiveToken } from './@base';
import { sendMessageTemplate } from '@phil/utils/discord-migration';

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
    const { finalMessage } = await sendMessageTemplate(
      phil.bot,
      message.channelId,
      {
        color: 'powder-blue',
        description: `**${validationResults.validatedMessage}** has been sent to the admins ${NOWRAP}for approval.`,
        fields: null,
        footer: `You have made ${numSubmissions} submission${
          numSubmissions !== 1 ? 's' : ''
        } during this session.`,
        title: ':pencil: Prompt Received :incoming_envelope:',
        type: 'embed',
      }
    );

    const reactableFactory = new SuggestSessionReactableFactory(
      phil.bot,
      phil.db,
      {
        timeLimit: token.currentSession.remainingTime.asMinutes(),
      },
      {
        userId: message.userId,
      },
      false
    );
    await reactableFactory.create(finalMessage);
  }
}
