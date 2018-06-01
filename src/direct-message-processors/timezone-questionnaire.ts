import { DirectMessageProcessor, IProcessorActiveToken } from './@base';
import { Phil } from '../phil/phil';
import { IPrivateMessage } from 'phil';
import { TimezoneQuestionnaire } from '../phil/timezone-questionnaire';

interface TimezoneQuestionnaireToken extends IProcessorActiveToken {
    readonly currentStage? : TimezoneQuestionnaire.Stage;
}

export class TimezoneQuestionnaireProcessor implements DirectMessageProcessor {
    readonly handle = 'timezone-questionnaire';

    async canProcess(phil : Phil, message : IPrivateMessage) : Promise<TimezoneQuestionnaireToken> {
        const currentStage = await TimezoneQuestionnaire.getStageForUser(phil.db, message.userId);
        if (!currentStage) {
            return {
                isActive: false
            };
        }

        if (!TimezoneQuestionnaire.isCurrentlyDoingQuestionnaire(currentStage.stage)) {
            return {
                isActive: false
            };
        }

        return {
            isActive: true,
            currentStage: currentStage
        }
    }

    async process(phil : Phil, message : IPrivateMessage, rawToken : IProcessorActiveToken) {
        const token = rawToken as TimezoneQuestionnaireToken;
        token.currentStage.processInput(phil, message);
    }
}
