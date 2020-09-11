import Server from '@phil/discord/Server';

import {
  ParseResult,
  TypeDefinition,
  ValidityResultType,
  FormatResult,
} from './@type-definition';

class MemberTypeDefinitionImplementation implements TypeDefinition {
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

  public async isValid(
    value: string,
    server: Server
  ): Promise<ValidityResultType> {
    if (!value) {
      return {
        errorMessage: 'No user ID was provided.',
        isValid: false,
      };
    }

    const member = await server.getMember(value);
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

  public async format(
    value: string | null,
    server: Server
  ): Promise<FormatResult> {
    if (!value) {
      return {
        multilineCodeBlock: '(None)',
        regularChat: '(None)',
      };
    }

    const member = await server.getMember(value);
    if (!member) {
      return {
        multilineCodeBlock: '(None)',
        regularChat: '(None)',
      };
    }

    return {
      multilineCodeBlock: member.displayName,
      regularChat: `<@${value}>`,
    };
  }
}

export const MemberTypeDefinition = new MemberTypeDefinitionImplementation();
export default MemberTypeDefinition;
