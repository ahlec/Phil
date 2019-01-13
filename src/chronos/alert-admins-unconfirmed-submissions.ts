import { Moment } from 'moment';
import EmbedColor from '../embed-color';
import Phil from '../phil';
import { DiscordPromises } from '../promises/discord';
import UnconfirmedPromptTally from '../prompts/unconfirmed-prompt-tally';
import ServerConfig from '../server-config';
import BotUtils from '../utils';
import Chrono from './@types';

export default class AlertAdminsUnconfirmedSubmissionsChrono implements Chrono {
  public readonly handle = 'alert-admins-unconfirmed-submissions';

  public async process(phil: Phil, serverConfig: ServerConfig, now: Moment) {
    const unconfirmedTally = await UnconfirmedPromptTally.collectForServer(
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

    DiscordPromises.sendEmbedMessage(
      phil.bot,
      serverConfig.botControlChannel.id,
      {
        color: EmbedColor.Info,
        description: reply,
        title: ':ballot_box: Unconfirmed Submissions',
      }
    );
  }

  private getUnconfimedPromptsMessage(
    serverConfig: ServerConfig,
    unconfirmedTallies: UnconfirmedPromptTally[]
  ): string {
    if (!unconfirmedTallies || unconfirmedTallies.length === 0) {
      return '';
    }

    let message = '';
    for (const tally of unconfirmedTallies) {
      message += this.getMessageForTally(tally) + '\n';
    }

    message += '\n';

    const randomTally = BotUtils.getRandomArrayEntry(unconfirmedTallies);
    message +=
      'You can say `' +
      serverConfig.commandPrefix +
      'unconfirmed ' +
      randomTally.bucketHandle +
      '` to start the confirmation process.';
    return message;
  }

  private getMessageForTally(tally: UnconfirmedPromptTally): string {
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
