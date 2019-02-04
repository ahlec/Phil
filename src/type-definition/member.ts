import Phil from '../phil';
import ServerConfig from '../server-config';
import BotUtils from '../utils';
import {
  ITypeDefinition,
  ParseResult,
  ValidityResultType,
} from './@type-definition';

class MemberTypeDefinitionImplementation implements ITypeDefinition {
  public readonly rules = ['Must be a mention of a user on the server.'];

  public tryParse(input: string): ParseResult {
    if (!input || !input.trim()) {
      return {
        errorMessage: 'Input was undefined, null, empty, or whitespace',
        wasSuccessful: false,
      };
    }

    const trimmedInput = input.trim();
    if (
      trimmedInput.length < 4 ||
      trimmedInput[0] !== '<' ||
      trimmedInput[1] !== '@' ||
      trimmedInput[trimmedInput.length - 1] !== '>'
    ) {
      return {
        errorMessage: 'Input was not a user ID link',
        wasSuccessful: false,
      };
    }

    const userId = trimmedInput.substr(2, trimmedInput.length - 3);
    if (!userId) {
      return {
        errorMessage: 'Provided user ID link was empty',
        wasSuccessful: false,
      };
    }

    return {
      parsedValue: userId,
      wasSuccessful: true,
    };
  }

  public isValid(
    value: string,
    phil: Phil,
    serverConfig: ServerConfig
  ): ValidityResultType {
    if (!value) {
      return {
        errorMessage: 'No user ID was provided.',
        isValid: false,
      };
    }

    const member = serverConfig.server.members[value];
    if (!member) {
      return {
        errorMessage: 'There is no member of this server with that user ID.',
        isValid: false,
      };
    }

    return {
      isValid: true,
    };
  }

  public toDisplayFormat(
    value: string | null,
    serverConfig: ServerConfig
  ): string {
    if (!value) {
      return '(None)';
    }

    const member = serverConfig.server.members[value];
    if (!member) {
      return '(None)';
    }

    return '<@' + value + '>';
  }

  public toMultilineCodeblockDisplayFormat(
    value: string | null,
    phil: Phil,
    serverConfig: ServerConfig
  ): string {
    if (!value) {
      return '(None)';
    }

    const user = phil.bot.users[value];
    const displayName = BotUtils.getUserDisplayName(user, serverConfig.server);
    return displayName || '(None)';
  }
}

export const MemberTypeDefinition = new MemberTypeDefinitionImplementation();
export default MemberTypeDefinition;
