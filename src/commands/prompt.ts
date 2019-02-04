import Bucket from '../buckets';
import Features from '../features/all-features';
import { HelpGroup } from '../help-groups';
import PublicMessage from '../messages/public';
import Phil from '../phil';
import Prompt from '../prompts/prompt';
import Command, { LoggerDefinition } from './@types';

export default class PromptCommand extends Command {
  public constructor(parentDefinition: LoggerDefinition) {
    super('prompt', parentDefinition, {
      feature: Features.Prompts,
      helpDescription: 'Asks Phil to remind you what the prompt of the day is.',
      helpGroup: HelpGroup.Prompts,
      versionAdded: 3,
    });
  }

  public async processMessage(
    phil: Phil,
    message: PublicMessage,
    commandArgs: ReadonlyArray<string>
  ): Promise<any> {
    const bucket = await Bucket.getFromChannelId(
      phil.bot,
      phil.db,
      message.channelId
    );
    if (!bucket) {
      throw new Error('This channel is not configured to work with prompts.');
    }

    const prompt = await Prompt.getCurrentPrompt(phil.bot, phil.db, bucket);
    if (!prompt) {
      throw new Error(
        "There's no prompt right now. That probably means that I'm out of them! Why don't you suggest more by sending me `" +
          message.serverConfig.commandPrefix +
          'suggest` and including your prompt?'
      );
    }

    prompt.sendToChannel(phil.bot, message.serverConfig);
  }
}
