import { HelpGroup } from '@phil/help-groups';
import PublicMessage from '@phil/messages/public';
import Phil from '@phil/phil';
import { deleteMessage, sendMessage } from '@phil/promises/discord';
import Command, { LoggerDefinition } from './@types';

export default class KuzcoCommand extends Command {
  public constructor(parentDefinition: LoggerDefinition) {
    super('kuzco', parentDefinition, {
      aliases: ['poison'],
      helpDescription: 'Oh right, the poison.',
      helpGroup: HelpGroup.Memes,
      versionAdded: 8,
    });
  }

  public async processMessage(
    phil: Phil,
    message: PublicMessage,
    commandArgs: ReadonlyArray<string>
  ): Promise<void> {
    const poison = this.getPoison(commandArgs);
    const reply = this.createReply(poison);

    await deleteMessage(phil.bot, message.channelId, message.id);
    await sendMessage(phil.bot, message.channelId, reply);
  }

  private getPoison(commandArgs: ReadonlyArray<string>): string[] {
    if (commandArgs.length === 0) {
      return ['kuzco', 'poison'];
    }

    if (commandArgs.length === 1) {
      return [commandArgs[0], 'poison'];
    }

    const indexOfSecondArgument = Math.ceil(commandArgs.length / 2);
    return [
      commandArgs
        .slice(0, indexOfSecondArgument)
        .join(' ')
        .trim(),
      commandArgs
        .slice(indexOfSecondArgument)
        .join(' ')
        .trim(),
    ];
  }

  private createReply(kuzcosPoison: string[]): string {
    return (
      'Oh right, the ' +
      kuzcosPoison[1] +
      '. The ' +
      kuzcosPoison[1] +
      ' for ' +
      kuzcosPoison[0] +
      '. The ' +
      kuzcosPoison[1] +
      ' chosen specially for ' +
      kuzcosPoison[0] +
      '. ' +
      kuzcosPoison[0] +
      "'s " +
      kuzcosPoison[1] +
      '.'
    );
  }
}
