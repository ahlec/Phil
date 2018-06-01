import { DirectMessageProcessor, IProcessorActiveToken } from './@base';
import { Phil } from '../phil/phil';
import { DiscordMessage } from '../phil/discord-message';
import { TimezoneQuestionnaire } from '../phil/timezone-questionnaire';

interface TimezoneQuestionnaireToken extends IProcessorActiveToken {
    readonly currentStage? : TimezoneQuestionnaire.Stage;
}

export class TimezoneQuestionnaireProcessor implements DirectMessageProcessor {
    readonly handle = 'timezone-questionnaire';

    async canProcess(phil : Phil, message : DiscordMessage) : Promise<TimezoneQuestionnaireToken> {
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

    async process(phil : Phil, message : DiscordMessage, rawToken : IProcessorActiveToken) {
        const token = rawToken as TimezoneQuestionnaireToken;
        token.currentStage.processInput(phil, message);
    }
}
