import { IPublicMessage } from 'phil';
import Features from '../phil/features/all-features';
import { HelpGroup } from '../phil/help-groups';
import Phil from '../phil/phil';
import TimezoneQuestionnaire from '../phil/timezones/questionnaire';
import BotUtils from '../phil/utils';
import ICommand from './@types';

export default class TimezoneCommand implements ICommand {
    public readonly name = 'timezone';
    public readonly aliases = [ 'timezones', 'tz' ];
    public readonly feature = Features.TimezoneProcessing;

    public readonly helpGroup = HelpGroup.Time;
    public readonly helpDescription = 'Begins a private message dialogue with Phil to set your timezone, or to change your current timezone.';

    public readonly versionAdded = 8;

    public readonly isAdminCommand = false;
    public processMessage(phil: Phil, message: IPublicMessage, commandArgs: ReadonlyArray<string>): Promise<any> {
        return TimezoneQuestionnaire.startQuestionnaire(phil, message.userId, true);
    }
};
