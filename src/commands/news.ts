import CommandInvocation from '@phil/CommandInvocation';
import { HelpGroup } from '@phil/help-groups';
import PermissionLevel from '@phil/permission-level';
import Command, { LoggerDefinition } from './@types';

class NewsCommand extends Command {
  public constructor(parentDefinition: LoggerDefinition) {
    super('news', parentDefinition, {
      helpDescription:
        'Has Phil echo the message provided in the news channel.',
      helpGroup: HelpGroup.Admin,
      permissionLevel: PermissionLevel.AdminOnly,
      versionAdded: 11,
    });
  }

  public async invoke(invocation: CommandInvocation): Promise<void> {
    const echoedMessage = this.getEchoedStatementFromInvocation(invocation);
    await invocation.context.serverConfig.newsChannel.sendMessage({
      text: echoedMessage,
      type: 'plain',
    });
  }

  private getEchoedStatementFromInvocation(
    invocation: CommandInvocation
  ): string {
    let echoedMessage = invocation.commandArgs.join(' ').trim();
    echoedMessage = echoedMessage.replace(/`/g, '');

    if (echoedMessage.length === 0) {
      throw new Error(
        'You must provide a message to this function that you would like Phil to repeat in #news. For instance, `' +
          invocation.context.serverConfig.commandPrefix +
          'news A New Guardian has been Chosen!`'
      );
    }

    return echoedMessage;
  }
}

export default NewsCommand;
