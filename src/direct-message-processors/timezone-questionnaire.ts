import ReceivedDirectMessage from '@phil/discord/ReceivedDirectMessage';
import Phil from '@phil/phil';
import {
  isCurrentlyDoingQuestionnaire,
  getStageForUser,
} from '@phil/timezones/questionnaire';
import IStage from '@phil/timezones/questionnaire-stages/@stage';
import { DirectMessageProcessor, ProcessorActiveToken } from './@base';

interface TimezoneQuestionnaireToken extends ProcessorActiveToken {
  readonly currentStage?: IStage;
}

export default class TimezoneQuestionnaireProcessor
  implements DirectMessageProcessor {
  public readonly handle = 'timezone-questionnaire';

  public async canProcess(
    phil: Phil,
    message: ReceivedDirectMessage
  ): Promise<TimezoneQuestionnaireToken> {
    const currentStage = await getStageForUser(phil.db, message.sender.id);
    if (!currentStage) {
      return {
        isActive: false,
      };
    }

    if (!isCurrentlyDoingQuestionnaire(currentStage)) {
      return {
        isActive: false,
      };
    }

    return {
      currentStage,
      isActive: true,
    };
  }

  public async process(
    phil: Phil,
    message: ReceivedDirectMessage,
    rawToken: ProcessorActiveToken
  ): Promise<void> {
    const token = rawToken as TimezoneQuestionnaireToken;
    if (!token.currentStage) {
      throw new Error('Cannot process an ongoing questionnaire');
    }

    await token.currentStage.processInput(phil, message);
  }
}
