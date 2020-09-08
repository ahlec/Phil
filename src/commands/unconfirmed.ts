import CommandInvocation from '@phil/CommandInvocation';
import Features from '@phil/features/all-features';
import { HelpGroup } from '@phil/help-groups';
import PermissionLevel from '@phil/permission-level';
import Submission from '@phil/prompts/submission';
import Command, { LoggerDefinition } from './@types';
import Database from '@phil/database';

const MAX_LIST_LENGTH = 10;

class UnconfirmedCommand extends Command {
  public constructor(parentDefinition: LoggerDefinition) {
    super('unconfirmed', parentDefinition, {
      feature: Features.Prompts,
      helpDescription:
        'Creates a list of some of the unconfirmed submissions that are awaiting admin approval before being added to the prompt queue.',
      helpGroup: HelpGroup.Prompts,
      permissionLevel: PermissionLevel.AdminOnly,
      versionAdded: 1,
    });
  }

  public async invoke(
    invocation: CommandInvocation,
    database: Database
  ): Promise<void> {
    await database.query(
      'DELETE FROM submission_confirmation_queue WHERE channel_id = $1',
      [invocation.context.channelId]
    );
    const bucket = await invocation.retrieveBucketFromArguments();
    const submissions = await bucket.getUnconfirmedSubmissions(MAX_LIST_LENGTH);
    if (submissions.length === 0) {
      await this.outputNoUnconfirmedSubmissions(invocation);
      return;
    }

    for (let index = 0; index < submissions.length; ++index) {
      const submission = submissions[index];
      await database.query(
        'INSERT INTO submission_confirmation_queue VALUES($1, $2, $3)',
        [invocation.context.channelId, submission.id, index]
      );
    }

    await this.outputList(invocation, submissions);
  }

  private async outputNoUnconfirmedSubmissions(
    invocation: CommandInvocation
  ): Promise<void> {
    await invocation.respond({
      text:
        ':large_blue_diamond: There are no unconfirmed submissions in this bucket right now.',
      type: 'plain',
    });
  }

  private async outputList(
    invocation: CommandInvocation,
    submissions: readonly Submission[]
  ): Promise<void> {
    const are = submissions.length === 1 ? 'is' : 'are';
    const submissionsNoun =
      submissions.length === 1 ? 'submission' : 'submissions';
    let message = `:pencil: Here ${are} ${submissions.length} unconfirmed ${submissionsNoun}.`;

    for (let index = 0; index < submissions.length; ++index) {
      message += `\n        \`${index + 1}\`: "${
        submissions[index].submissionText
      }"`;
    }

    message +=
      '\nConfirm submissions with `' +
      invocation.context.serverConfig.commandPrefix +
      'confirm`. You can specify a single submission by using its number (`';
    message +=
      invocation.context.serverConfig.commandPrefix +
      'confirm 3`) or a range of submissions using a hyphen (`' +
      invocation.context.serverConfig.commandPrefix +
      'confirm 2-7`)';

    await invocation.respond({
      text: message,
      type: 'plain',
    });
  }
}

export default UnconfirmedCommand;
