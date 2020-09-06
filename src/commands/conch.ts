import CommandInvocation from '@phil/CommandInvocation';
import { HelpGroup } from '@phil/help-groups';
import Phil from '@phil/phil';
import { getRandomArrayEntry } from '@phil/utils';
import Command, { LoggerDefinition } from './@types';

const conchReplies = [
  'Maybe someday',
  'Nothing',
  'Neither',
  'Follow the seahorse',
  "I don't think so",
  'No',
  'No',
  'No',
  'Yes',
  'Try asking again',
  'Try asking again',
];

class ConchCommand extends Command {
  public constructor(parentDefinition: LoggerDefinition) {
    super('conch', parentDefinition, {
      aliases: ['magicconch', 'mc'],
      helpDescription: 'The Magic Conch says...',
      helpGroup: HelpGroup.Memes,
      versionAdded: 3,
    });
  }

  public async processMessage(
    phil: Phil,
    invocation: CommandInvocation
  ): Promise<void> {
    const conchReply = getRandomArrayEntry(conchReplies);
    const reply = ':shell: The Magic Conch Shell says: **' + conchReply + '**.';
    await invocation.respond({
      text: reply,
      type: 'plain',
    });
  }
}

export default ConchCommand;
