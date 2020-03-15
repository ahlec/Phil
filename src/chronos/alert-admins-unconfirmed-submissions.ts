import EmbedColor from '../embed-color';
import Features from '../features/all-features';
import Phil from '../phil';
import { sendEmbedMessage } from '../promises/discord';
import UnconfirmedSubmissionTally from '../prompts/unconfirmed-submission-tally';
import ServerConfig from '../server-config';
import { getRandomArrayEntry } from '../utils';
import Chrono, { Logger, LoggerDefinition } from './@types';

const HANDLE = 'alert-admins-unconfirmed-submissions';
export default class AlertAdminsUnconfirmedSubmissionsChrono extends Logger
  implements Chrono {
  public readonly handle = HANDLE;
  public readonly requiredFeature = Features.Prompts;

  public constructor(parentDefinition: LoggerDefinition) {
    super(new LoggerDefinition(HANDLE, parentDefinition));
  }

  public async process(phil: Phil, serverConfig: ServerConfig): Promise<void> {
    const unconfirmedTally = await UnconfirmedSubmissionTally.collectForServer(
      phil.db,
      serverConfig.server.id
    );
    const reply = this.getUnconfimedPromptsMessage(
      serverConfig,
      unconfirmedTally
    ).trim();
    if (reply.length === 0) {
      return;
    }

    await sendEmbedMessage(phil.bot, serverConfig.botControlChannel.id, {
      color: EmbedColor.Info,
      description: reply,
      title: ':ballot_box: Unconfirmed Submissions',
    });
  }

  private getUnconfimedPromptsMessage(
    serverConfig: ServerConfig,
    unconfirmedTallies: UnconfirmedSubmissionTally[]
  ): string {
    if (!unconfirmedTallies || unconfirmedTallies.length === 0) {
      return '';
    }

    let message = '';
    for (const tally of unconfirmedTallies) {
      message += this.getMessageForTally(tally) + '\n';
    }

    message += '\n';

    const randomTally = getRandomArrayEntry(unconfirmedTallies);
    message +=
      'You can say `' +
      serverConfig.commandPrefix +
      'unconfirmed ' +
      randomTally.bucketHandle +
      '` to start the confirmation process.';
    return message;
  }

  private getMessageForTally(tally: UnconfirmedSubmissionTally): string {
    if (tally.numUnconfirmed === 1) {
      return (
        'There is **1** unconfirmed submission waiting in bucket `' +
        tally.bucketHandle +
        '`.'
      );
    }

    return (
      'There are **' +
      tally.numUnconfirmed +
      '** submissions waiting in bucket `' +
      tally.bucketHandle +
      '`.'
    );
  }
}
