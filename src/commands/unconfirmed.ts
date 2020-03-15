import Bucket from '../buckets';
import Features from '../features/all-features';
import { HelpGroup } from '../help-groups';
import PublicMessage from '../messages/public';
import PermissionLevel from '../permission-level';
import Phil from '../phil';
import { sendMessage } from '../promises/discord';
import Submission from '../prompts/submission';
import ServerConfig from '../server-config';
import Command, { LoggerDefinition } from './@types';

const MAX_LIST_LENGTH = 10;

export default class UnconfirmedCommand extends Command {
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

  public async processMessage(
    phil: Phil,
    message: PublicMessage,
    commandArgs: ReadonlyArray<string>
  ): Promise<void> {
    await phil.db.query(
      'DELETE FROM submission_confirmation_queue WHERE channel_id = $1',
      [message.channelId]
    );
    const bucket = await Bucket.retrieveFromCommandArgs(
      phil,
      commandArgs,
      message.serverConfig,
      'unconfirmed',
      false
    );

    const submissions = await Submission.getUnconfirmed(
      phil.db,
      bucket,
      MAX_LIST_LENGTH
    );
    if (submissions.length === 0) {
      await this.outputNoUnconfirmedSubmissions(phil, message.channelId);
      return;
    }

    for (let index = 0; index < submissions.length; ++index) {
      const submission = submissions[index];
      await phil.db.query(
        'INSERT INTO submission_confirmation_queue VALUES($1, $2, $3)',
        [message.channelId, submission.id, index]
      );
    }

    await this.outputList(
      phil,
      message.serverConfig,
      message.channelId,
      submissions
    );
  }

  private async outputNoUnconfirmedSubmissions(
    phil: Phil,
    channelId: string
  ): Promise<void> {
    await sendMessage(
      phil.bot,
      channelId,
      ':large_blue_diamond: There are no unconfirmed submissions in this bucket right now.'
    );
  }

  private async outputList(
    phil: Phil,
    serverConfig: ServerConfig,
    channelId: string,
    submissions: Submission[]
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
      serverConfig.commandPrefix +
      'confirm`. You can specify a single submission by using its number (`';
    message +=
      serverConfig.commandPrefix +
      'confirm 3`) or a range of submissions using a hyphen (`' +
      serverConfig.commandPrefix +
      'confirm 2-7`)';

    await sendMessage(phil.bot, channelId, message);
  }
}
