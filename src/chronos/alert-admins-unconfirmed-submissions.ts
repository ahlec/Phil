import Client from '@phil/discord/Client';
import Server from '@phil/discord/Server';

import Database from '@phil/database';
import Features from '@phil/features/all-features';
import UnconfirmedSubmissionTally from '@phil/prompts/unconfirmed-submission-tally';
import ServerConfig from '@phil/server-config';
import { getRandomArrayEntry } from '@phil/utils';
import Chrono, { Logger, LoggerDefinition } from './@types';

const HANDLE = 'alert-admins-unconfirmed-submissions';
export default class AlertAdminsUnconfirmedSubmissionsChrono
  extends Logger
  implements Chrono {
  public readonly databaseId = 2;
  public readonly handle = HANDLE;
  public readonly requiredFeature = Features.Prompts;

  public constructor(parentDefinition: LoggerDefinition) {
    super(new LoggerDefinition(HANDLE, parentDefinition));
  }

  public async process(
    discordClient: Client,
    database: Database,
    server: Server,
    serverConfig: ServerConfig
  ): Promise<void> {
    const unconfirmedTally = await UnconfirmedSubmissionTally.collectForServer(
      database,
      server.id
    );
    const reply = this.getUnconfimedPromptsMessage(
      serverConfig,
      unconfirmedTally
    ).trim();
    if (reply.length === 0) {
      return;
    }

    await serverConfig.botControlChannel.sendMessage({
      color: 'powder-blue',
      description: reply,
      fields: null,
      footer: null,
      title: ':ballot_box: Unconfirmed Submissions',
      type: 'embed',
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
