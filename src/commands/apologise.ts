import { HelpGroup } from '../help-groups';
import PublicMessage from '../messages/public';
import Phil from '../phil';
import { sendMessage } from '../promises/discord';
import { getRandomArrayEntry } from '../utils';
import Command, { LoggerDefinition } from './@types';

const apologies = [
  'I am incredibly sorry for my mistake.',
  'Es tut mir aber leid, dass ich ein schlechte Yeti war.',
  "We all make mistakes, and I made a horrible one. I'm sincerely sorry.",
  'I apologise for my behaviour, it was unacceptable and I will never do it again.',
  "I'm sorry.",
  "I'm really sorry.",
  "I hope you can forgive me for what I've done.",
  "I will do my best to learn from this mistake that I've made.",
  'On my Yeti honour and pride, I shall never do this again.',
];

export default class ApologiseCommand extends Command {
  public constructor(parentDefinition: LoggerDefinition) {
    super('apologise', parentDefinition, {
      aliases: ['apologize'],
      helpGroup: HelpGroup.None,
      versionAdded: 3,
    });
  }

  public async processMessage(
    phil: Phil,
    message: PublicMessage,
    commandArgs: ReadonlyArray<string>
  ): Promise<any> {
    const apology = getRandomArrayEntry(apologies);
    return sendMessage(phil.bot, message.channelId, apology);
  }
}
