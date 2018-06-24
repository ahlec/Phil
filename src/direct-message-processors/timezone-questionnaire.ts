import { IPrivateMessage } from 'phil';
import Phil from '../phil/phil';
import TimezoneQuestionnaire from '../phil/timezones/questionnaire';
import IStage from '../phil/timezones/questionnaire-stages/@stage';
import { IDirectMessageProcessor, IProcessorActiveToken } from './@base';

interface ITimezoneQuestionnaireToken extends IProcessorActiveToken {
    readonly currentStage?: IStage;
}

export default class TimezoneQuestionnaireProcessor implements IDirectMessageProcessor {
    public readonly handle = 'timezone-questionnaire';

    public async canProcess(phil: Phil, message: IPrivateMessage): Promise<ITimezoneQuestionnaireToken> {
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

    public async process(phil: Phil, message: IPrivateMessage, rawToken: IProcessorActiveToken) {
        const token = rawToken as ITimezoneQuestionnaireToken;
        token.currentStage.processInput(phil, message);
    }
}
