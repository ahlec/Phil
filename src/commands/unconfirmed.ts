import Bucket from '../buckets';
import Features from '../features/all-features';
import { HelpGroup } from '../help-groups';
import PublicMessage from '../messages/public';
import PermissionLevel from '../permission-level';
import Phil from '../phil';
import { DiscordPromises } from '../promises/discord';
import Submission from '../prompts/submission';
import ServerConfig from '../server-config';
import ICommand from './@types';

const MAX_LIST_LENGTH = 10;

export default class UnconfirmedCommand implements ICommand {
  public readonly name = 'unconfirmed';
  public readonly aliases: ReadonlyArray<string> = [];
  public readonly feature = Features.Prompts;
  public readonly permissionLevel = PermissionLevel.AdminOnly;

  public readonly helpGroup = HelpGroup.Prompts;
  public readonly helpDescription =
    'Creates a list of some of the unconfirmed submissions that are awaiting admin approval before being added to the prompt queue.';

  public readonly versionAdded = 1;

  public async processMessage(
    phil: Phil,
    message: PublicMessage,
    commandArgs: ReadonlyArray<string>
  ): Promise<any> {
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
      return this.outputNoUnconfirmedSubmissions(phil, message.channelId);
    }

    for (let index = 0; index < submissions.length; ++index) {
      const submission = submissions[index];
      await phil.db.query(
        'INSERT INTO submission_confirmation_queue VALUES($1, $2, $3)',
        [message.channelId, submission.id, index]
      );
    }

    return this.outputList(
      phil,
      message.serverConfig,
      message.channelId,
      submissions
    );
  }

  private outputNoUnconfirmedSubmissions(
    phil: Phil,
    channelId: string
  ): Promise<string> {
    return DiscordPromises.sendMessage(
      phil.bot,
      channelId,
      ':large_blue_diamond: There are no unconfirmed submissions in this bucket right now.'
    );
  }

  private outputList(
    phil: Phil,
    serverConfig: ServerConfig,
    channelId: string,
    submissions: Submission[]
  ): Promise<string> {
    const are = submissions.length === 1 ? 'is' : 'are';
    const submissionsNoun =
      submissions.length === 1 ? 'submission' : 'submissions';
    let message = `:pencil: Here ${are} ${
      submissions.length
    } unconfirmed ${submissionsNoun}.`;

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

    return DiscordPromises.sendMessage(phil.bot, channelId, message);
  }
}
