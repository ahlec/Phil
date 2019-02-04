import Features from '../features/all-features';
import { HelpGroup } from '../help-groups';
import PublicMessage from '../messages/public';
import Phil from '../phil';
import TimezoneQuestionnaire from '../timezones/questionnaire';
import Command, { LoggerDefinition } from './@types';

export default class TimezoneCommand extends Command {
  public constructor(parentDefinition: LoggerDefinition) {
    super('timezone', parentDefinition, {
      aliases: ['timezones', 'tz'],
      feature: Features.TimezoneProcessing,
      helpDescription:
        'Begins a private message dialogue with Phil to set your timezone, or to change your current timezone.',
      helpGroup: HelpGroup.Time,
      versionAdded: 8,
    });
  }

  public processMessage(
    phil: Phil,
    message: PublicMessage,
    commandArgs: ReadonlyArray<string>
  ): Promise<any> {
    return TimezoneQuestionnaire.startQuestionnaire(phil, message.userId, true);
  }
}
