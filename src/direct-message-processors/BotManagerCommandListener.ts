import GlobalConfig from '../GlobalConfig';
import Logger from '../Logger';
import LoggerDefinition from '../LoggerDefinition';
import PrivateMessage from '../messages/private';
import Phil from '../phil';
import BotUtils from '../utils';
import { DirectMessageProcessor, ProcessorActiveToken } from './@base';

type CommandParseResult =
  | { isValid: true; command: string }
  | { isValid: false; error: string | null };

const MESSAGE_PREFIX = '> ';
const COMMAND_CLEARCACHE = 'clearcache';

function parseCommand(message: string): CommandParseResult {
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

  // TODO: Make reusable
  const command = message.substr(MESSAGE_PREFIX.length);
  if (!command || command !== COMMAND_CLEARCACHE) {
    return {
      error: `Unknown command (known command: \`${COMMAND_CLEARCACHE}\`)`,
      isValid: false,
    };
  }

  return {
    command: COMMAND_CLEARCACHE,
    isValid: true,
  };
}

const HANDLE = 'bot-manager-command-listener';

export default class BotManagerCommandListener extends Logger
  implements DirectMessageProcessor {
  public readonly handle = HANDLE;

  public constructor(parentDefinition: LoggerDefinition) {
    super(new LoggerDefinition(HANDLE, parentDefinition));
  }

  public async canProcess(
    _: Phil,
    message: PrivateMessage
  ): Promise<ProcessorActiveToken> {
    return {
      isActive: message.userId === GlobalConfig.botManagerUserId,
    };
  }

  public async process(phil: Phil, message: PrivateMessage) {
    const parseResult = parseCommand(message.content);
    if (!parseResult.isValid) {
      if (parseResult.error) {
        await BotUtils.sendErrorMessage({
          bot: phil.bot,
          channelId: message.channelId,
          message: parseResult.error,
        });
      }

      return;
    }

    this.write(`Processing command ${parseResult.command}.`);

    switch (parseResult.command) {
      case COMMAND_CLEARCACHE: {
        phil.serverDirectory.clearCache();
        await BotUtils.sendSuccessMessage({
          bot: phil.bot,
          channelId: message.channelId,
          message: 'Caches have been cleared.',
        });
        break;
      }
      default: {
        await BotUtils.sendErrorMessage({
          bot: phil.bot,
          channelId: message.channelId,
          message: `Command \`${parseResult.command}\` not implemented`,
        });
        break;
      }
    }
  }
}
