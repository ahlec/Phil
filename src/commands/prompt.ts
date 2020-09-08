import CommandInvocation from '@phil/CommandInvocation';
import Database from '@phil/database';
import Features from '@phil/features/all-features';
import { HelpGroup } from '@phil/help-groups';
import Phil from '@phil/phil';
import Command, { LoggerDefinition } from './@types';

class PromptCommand extends Command {
  public constructor(parentDefinition: LoggerDefinition) {
    super('prompt', parentDefinition, {
      feature: Features.Prompts,
      helpDescription: 'Asks Phil to remind you what the prompt of the day is.',
      helpGroup: HelpGroup.Prompts,
      versionAdded: 3,
    });
  }

  public async invoke(
    invocation: CommandInvocation,
    database: Database,
    legacyPhil: Phil
  ): Promise<void> {
    const bucket = await invocation.context.buckets.retrieve({
      channelId: invocation.context.channelId,
      type: 'channel',
    });
    if (!bucket) {
      throw new Error('This channel is not configured to work with prompts.');
    }

    const prompt = await bucket.getCurrentPrompt();
    if (!prompt) {
      throw new Error(
        "There's no prompt right now. That probably means that I'm out of them! Why don't you suggest more by sending me `" +
          invocation.context.serverConfig.commandPrefix +
          'suggest` and including your prompt?'
      );
    }

    await prompt.sendToChannel(legacyPhil.bot, invocation.context.serverConfig);
  }
}

export default PromptCommand;
