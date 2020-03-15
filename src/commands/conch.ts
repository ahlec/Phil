import { HelpGroup } from '../help-groups';
import PublicMessage from '../messages/public';
import Phil from '../phil';
import { sendMessage } from '../promises/discord';
import { getRandomArrayEntry } from '../utils';
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

export default class ConchCommand extends Command {
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
    message: PublicMessage
  ): Promise<void> {
    const conchReply = getRandomArrayEntry(conchReplies);
    const reply = ':shell: The Magic Conch Shell says: **' + conchReply + '**.';
    await sendMessage(phil.bot, message.channelId, reply);
  }
}
