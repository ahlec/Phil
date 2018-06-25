import PrivateMessage from '../messages/private';
import Phil from '../phil';
import TimezoneQuestionnaire from '../timezones/questionnaire';
import IStage from '../timezones/questionnaire-stages/@stage';
import { IDirectMessageProcessor, IProcessorActiveToken } from './@base';

interface ITimezoneQuestionnaireToken extends IProcessorActiveToken {
    readonly currentStage?: IStage;
}

export default class TimezoneQuestionnaireProcessor implements IDirectMessageProcessor {
    public readonly handle = 'timezone-questionnaire';

    public async canProcess(phil: Phil, message: PrivateMessage): Promise<ITimezoneQuestionnaireToken> {
        const currentStage = await TimezoneQuestionnaire.getStageForUser(phil.db, message.userId);
        if (!currentStage) {
            return {
                isActive: false
            };
        }

        if (!TimezoneQuestionnaire.isCurrentlyDoingQuestionnaire(currentStage)) {
            return {
                isActive: false
            };
        }

        return {
            currentStage,
            isActive: true
        }
    }

    public async process(phil: Phil, message: PrivateMessage, rawToken: IProcessorActiveToken) {
        const token = rawToken as ITimezoneQuestionnaireToken;
        token.currentStage.processInput(phil, message);
    }
}
