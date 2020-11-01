import CommandInvocation from '@phil/CommandInvocation';
import Features from '@phil/features/all-features';
import { HelpGroup } from '@phil/help-groups';
import Phil from '@phil/phil';
import { startQuestionnaire } from '@phil/timezones/questionnaire';
import Command, { LoggerDefinition } from './@types';
import Database from '@phil/database';

class TimezoneCommand extends Command {
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

  public async invoke(
    invocation: CommandInvocation,
    database: Database,
    legacyPhil: Phil
  ): Promise<void> {
    await startQuestionnaire(invocation.member.user, legacyPhil, true);
  }
}

export default TimezoneCommand;
