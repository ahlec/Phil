import GlobalConfig from '../global-config';
import Phil from '../phil';
import ServerConfig from '../server-config';
import {
  ITypeDefinition,
  ParseResult,
  ValidityResultType,
} from './@type-definition';

interface IInvalidPrefixCharacterDefinition {
  character: string;
  name: string;
  indefiniteArticle: string;
}

const InvalidPrefixCharacters: ReadonlyArray<
  IInvalidPrefixCharacterDefinition
> = [
  { character: '`', name: 'tilde', indefiniteArticle: 'a' },
  { character: '#', name: 'hash symbol', indefiniteArticle: 'a' },
  { character: '@', name: 'at sign', indefiniteArticle: 'an' },
];

const Rules = [
  `Must be between ${GlobalConfig.minCommandPrefixLength} and ${
    GlobalConfig.maxCommandPrefixLength
  } characters in length.`,
  'May not contain any whitespace characters.',
];

for (const invalidCharacter of InvalidPrefixCharacters) {
  Rules.push(
    `May not contain ${invalidCharacter.indefiniteArticle} ${
      invalidCharacter.name
    } (${invalidCharacter.character}).`
  );
}

class CommandPrefixTypeDefinitionImplementation implements ITypeDefinition {
  public readonly rules = Rules;

  public tryParse(input: string): ParseResult {
    if (!input) {
      return {
        errorMessage: 'No text was provided.',
        wasSuccessful: false,
      };
    }

    if (
      input.length < GlobalConfig.minCommandPrefixLength ||
      input.length > GlobalConfig.maxCommandPrefixLength
    ) {
      return {
        errorMessage: `A command prefix must be between ${
          GlobalConfig.minCommandPrefixLength
        } and ${GlobalConfig.maxCommandPrefixLength} characters in length.`,
        wasSuccessful: false,
      };
    }

    if (/\s/g.test(input)) {
      return {
        errorMessage:
          'A command prefix may not contain any whitespace characters.',
        wasSuccessful: false,
      };
    }

    for (const invalidCharacter of InvalidPrefixCharacters) {
      if (input.indexOf(invalidCharacter.character) < 0) {
        continue;
      }

      return {
        errorMessage: `A command prefix may not contain the ${
          invalidCharacter.name
        } (${invalidCharacter.character}) character.`,
        wasSuccessful: false,
      };
    }

    return {
      parsedValue: input,
      wasSuccessful: true,
    };
  }

  public isValid(
    value: string,
    phil: Phil,
    serverConfig: ServerConfig
  ): ValidityResultType {
    return {
      isValid: true,
    };
  }

  public toDisplayFormat(value: string, serverConfig: ServerConfig): string {
    return value;
  }

  public toMultilineCodeblockDisplayFormat(
    value: string,
    phil: Phil,
    serverConfig: ServerConfig
  ): string {
    return value;
  }
}

export const CommandPrefixTypeDefinition = new CommandPrefixTypeDefinitionImplementation();
export default CommandPrefixTypeDefinition;
