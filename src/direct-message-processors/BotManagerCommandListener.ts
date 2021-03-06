import ReceivedDirectMessage from '@phil/discord/ReceivedDirectMessage';

import { BotManagerCommand, instantiateCommands } from '@phil/bm-commands';
import GlobalConfig from '@phil/GlobalConfig';
import Logger from '@phil/Logger';
import LoggerDefinition from '@phil/LoggerDefinition';
import Phil from '@phil/phil';
import { DirectMessageProcessor, ProcessorActiveToken } from './@base';

type CommandParseResult =
  | { isValid: true; command: BotManagerCommand; args: string }
  | { isValid: false; error: string | null };

const MESSAGE_PREFIX = '> ';

const HANDLE = 'bot-manager-command-listener';

export default class BotManagerCommandListener
  extends Logger
  implements DirectMessageProcessor {
  public readonly handle = HANDLE;
  private readonly commands: Map<string, BotManagerCommand>;
  private readonly commandNames: ReadonlyArray<string>;

  public constructor(parentDefinition: LoggerDefinition) {
    super(new LoggerDefinition(HANDLE, parentDefinition));
    this.commands = instantiateCommands(this.definition);
    this.commandNames = Array.from(this.commands.keys());
  }

  public async canProcess(
    _: Phil,
    message: ReceivedDirectMessage
  ): Promise<ProcessorActiveToken> {
    return {
      isActive: message.sender.id === GlobalConfig.botManagerUserId,
    };
  }

  public async process(
    phil: Phil,
    message: ReceivedDirectMessage
  ): Promise<void> {
    const parseResult = this.parseCommand(message.body);
    if (!parseResult.isValid) {
      if (parseResult.error) {
        await message.respond({
          error: parseResult.error,
          type: 'error',
        });
      }

      return;
    }

    this.write(`Processing command ${parseResult.command.name}.`);
    await parseResult.command.execute(phil, message, parseResult.args);
  }

  private parseCommand(message: string): CommandParseResult {
    if (!message) {
      return {
        error: null,
        isValid: false,
      };
    }

    message = message.trim();
    if (!message.startsWith(MESSAGE_PREFIX)) {
      return {
        error: null,
        isValid: false,
      };
    }

    const nameStartIndex = MESSAGE_PREFIX.length;
    const nameEndIndex = message.indexOf(' ', nameStartIndex);
    const commandName = message
      .substring(
        nameStartIndex,
        nameEndIndex < 0 ? message.length : nameEndIndex
      )
      .toLowerCase();
    const command = this.commands.get(commandName);
    if (command) {
      return {
        args: nameEndIndex < 0 ? '' : message.substr(nameEndIndex + 1),
        command,
        isValid: true,
      };
    }

    return {
      error: `Unknown command (known commands: ${this.commandNames
        .map((name) => `\`${name}\``)
        .join(', ')})`,
      isValid: false,
    };
  }
}
