import CommandInvocation from '@phil/CommandInvocation';
import { HelpGroup } from '@phil/help-groups';
import Phil from '@phil/phil';
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
    invocation: CommandInvocation
  ): Promise<void> {
    const poison = this.getPoison(invocation.commandArgs);
    const reply = this.createReply(poison);

    await invocation.deleteInvocationMessage();
    await invocation.respond({
      text: reply,
      type: 'plain',
    });
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
      commandArgs.slice(0, indexOfSecondArgument).join(' ').trim(),
      commandArgs.slice(indexOfSecondArgument).join(' ').trim(),
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
