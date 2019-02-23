import Phil from '../phil';
import ServerConfig from '../server-config';
import {
  ParseResult,
  TypeDefinition,
  ValidityResultType,
} from './@type-definition';

const MIN_LENGTH = 3;
const MAX_LENGTH = 20;
const VALID_CHARACTERS_REGEX = /^[a-zA-Z0-9\-]*$/;

class TempChannelNameTypeDefinitionImplementation implements TypeDefinition {
  public readonly rules = [
    `Must be between ${MIN_LENGTH} and ${MAX_LENGTH} characters.`,
    'Must contain only alphanumeric characters and hyphens.',
    'Must not start or end with a hyphen, or have two or more hyphens in a row.',
    'Must not be a name currently in use or one that was used recently',
  ];

  public tryParse(input: string): ParseResult {
    if (!input || !input.trim()) {
      return {
        errorMessage: 'Input was undefined, null, empty, or whitespace',
        wasSuccessful: false,
      };
    }

    const trimmedInput = input.trim();
    if (trimmedInput.length < MIN_LENGTH) {
      return {
        errorMessage: `Input was less than ${MIN_LENGTH} characters`,
        wasSuccessful: false,
      };
    }

    if (trimmedInput.length > MAX_LENGTH) {
      return {
        errorMessage: `Input was more than ${MAX_LENGTH} characters`,
        wasSuccessful: false,
      };
    }

    if (!VALID_CHARACTERS_REGEX.test(trimmedInput)) {
      return {
        errorMessage:
          'Input contained invalid characters (only alphanumeric characters and hyphens are allowed)',
        wasSuccessful: false,
      };
    }

    if (
      trimmedInput[0] === '-' ||
      trimmedInput[trimmedInput.length - 1] === '-'
    ) {
      return {
        errorMessage: 'Input may not start or end with a hyphen',
        wasSuccessful: false,
      };
    }

    return {
      parsedValue: `temp-${trimmedInput}`,
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
        errorMessage: 'No name was provided.',
        isValid: false,
      };
    }

    const channels = Object.values(serverConfig.server.channels);
    if (channels.find(channel => channel.name === value)) {
      return {
        errorMessage:
          'There is already a channel by this name, or it was used recently.',
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

    return value;
  }

  public toMultilineCodeblockDisplayFormat(
    value: string | null,
    phil: Phil,
    serverConfig: ServerConfig
  ): string {
    if (!value) {
      return '(None)';
    }

    return value;
  }
}

export const TempChannelNameTypeDefinition = new TempChannelNameTypeDefinitionImplementation();
export default TempChannelNameTypeDefinition;
