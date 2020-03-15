import { HelpGroup } from '../help-groups';
import PublicMessage from '../messages/public';
import PermissionLevel from '../permission-level';
import Phil from '../phil';
import { sendMessage } from '@phil/promises/discord';
import Command, { LoggerDefinition } from './@types';

export default class NewsCommand extends Command {
  public constructor(parentDefinition: LoggerDefinition) {
    super('news', parentDefinition, {
      helpDescription:
        'Has Phil echo the message provided in the news channel.',
      helpGroup: HelpGroup.Admin,
      permissionLevel: PermissionLevel.AdminOnly,
      versionAdded: 11,
    });
  }

  public async processMessage(
    phil: Phil,
    message: PublicMessage,
    commandArgs: ReadonlyArray<string>
  ): Promise<void> {
    const echoedMessage = this.getEchoedStatementFromCommandArgs(
      message,
      commandArgs
    );
    await sendMessage(
      phil.bot,
      message.serverConfig.newsChannel.id,
      echoedMessage
    );
  }

  private getEchoedStatementFromCommandArgs(
    message: PublicMessage,
    commandArgs: ReadonlyArray<string>
  ): string {
    let echoedMessage = commandArgs.join(' ').trim();
    echoedMessage = echoedMessage.replace(/`/g, '');

    if (echoedMessage.length === 0) {
      throw new Error(
        'You must provide a message to this function that you would like Phil to repeat in #news. For instance, `' +
          message.serverConfig.commandPrefix +
          'news A New Guardian has been Chosen!`'
      );
    }

    return echoedMessage;
  }
}
