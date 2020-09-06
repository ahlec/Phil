import Bucket from '@phil/buckets';
import CommandInvocation from '@phil/CommandInvocation';
import Database from '@phil/database';
import Features from '@phil/features/all-features';
import { HelpGroup } from '@phil/help-groups';
import Phil from '@phil/phil';
import Prompt from '@phil/prompts/prompt';
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
    const bucket = await Bucket.getFromChannelId(
      legacyPhil.bot,
      database,
      invocation.context.channelId
    );
    if (!bucket) {
      throw new Error('This channel is not configured to work with prompts.');
    }

    const prompt = await Prompt.getCurrentPrompt(
      legacyPhil.bot,
      database,
      bucket
    );
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
