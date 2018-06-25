import Features from '../features/all-features';
import { HelpGroup } from '../help-groups';
import PublicMessage from '../messages/public';
import Phil from '../phil';
import TimezoneQuestionnaire from '../timezones/questionnaire';
import ICommand from './@types';

export default class TimezoneCommand implements ICommand {
    public readonly name = 'timezone';
    public readonly aliases = [ 'timezones', 'tz' ];
    public readonly feature = Features.TimezoneProcessing;

    public readonly helpGroup = HelpGroup.Time;
    public readonly helpDescription = 'Begins a private message dialogue with Phil to set your timezone, or to change your current timezone.';

    public readonly versionAdded = 8;

    public readonly isAdminCommand = false;
    public processMessage(phil: Phil, message: PublicMessage, commandArgs: ReadonlyArray<string>): Promise<any> {
        return TimezoneQuestionnaire.startQuestionnaire(phil, message.userId, true);
    }
}
