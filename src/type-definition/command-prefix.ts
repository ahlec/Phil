import GlobalConfig from '@phil/GlobalConfig';
import {
  ParseResult,
  TypeDefinition,
  ValidityResultType,
  FormatResult,
} from './@type-definition';

interface InvalidPrefixCharacterDefinition {
  character: string;
  name: string;
  indefiniteArticle: string;
}

const InvalidPrefixCharacters: ReadonlyArray<InvalidPrefixCharacterDefinition> = [
  { character: '`', indefiniteArticle: 'a', name: 'tilde' },
  { character: '#', indefiniteArticle: 'a', name: 'hash symbol' },
  { character: '@', indefiniteArticle: 'an', name: 'at sign' },
];

const Rules = [
  `Must be between ${GlobalConfig.minCommandPrefixLength} and ${GlobalConfig.maxCommandPrefixLength} characters in length.`,
  'May not contain any whitespace characters.',
];

for (const invalidCharacter of InvalidPrefixCharacters) {
  Rules.push(
    `May not contain ${invalidCharacter.indefiniteArticle} ${invalidCharacter.name} (${invalidCharacter.character}).`
  );
}

class CommandPrefixTypeDefinitionImplementation implements TypeDefinition {
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
        errorMessage: `A command prefix must be between ${GlobalConfig.minCommandPrefixLength} and ${GlobalConfig.maxCommandPrefixLength} characters in length.`,
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
        errorMessage: `A command prefix may not contain the ${invalidCharacter.name} (${invalidCharacter.character}) character.`,
        wasSuccessful: false,
      };
    }

    return {
      parsedValue: input,
      wasSuccessful: true,
    };
  }

  public async isValid(): Promise<ValidityResultType> {
    return {
      isValid: true,
    };
  }

  public async format(value: string | null): Promise<FormatResult> {
    return {
      multilineCodeBlock: value || '',
      regularChat: value || '',
    };
  }
}

export const CommandPrefixTypeDefinition = new CommandPrefixTypeDefinitionImplementation();
export default CommandPrefixTypeDefinition;
