import Server from '@phil/discord/Server';

import {
  ParseResult,
  TypeDefinition,
  ValidityResultType,
  FormatResult,
} from './@type-definition';

const ROLE_LINK_PREFIX = '<@&';
const ROLE_LINK_SUFFIX = '>';
const ROLE_LINK_MARKUP_LENGTH =
  ROLE_LINK_PREFIX.length + ROLE_LINK_SUFFIX.length;

class RoleTypeDefinitionImplementation implements TypeDefinition {
  public readonly rules = [
    'Must be a link to a role on the server.',
    'Must not be @here',
  ];

  public tryParse(input: string): ParseResult {
    if (!input || !input.trim()) {
      return {
        errorMessage: 'Input was undefined, null, empty, or whitespace',
        wasSuccessful: false,
      };
    }

    const trimmedInput = input.trim();
    if (
      trimmedInput.length < ROLE_LINK_MARKUP_LENGTH ||
      !trimmedInput.startsWith(ROLE_LINK_PREFIX) ||
      !trimmedInput.endsWith(ROLE_LINK_SUFFIX)
    ) {
      return {
        errorMessage: 'Input was not a role ID link',
        wasSuccessful: false,
      };
    }

    const roleId = trimmedInput.substr(
      ROLE_LINK_PREFIX.length,
      trimmedInput.length - ROLE_LINK_MARKUP_LENGTH
    );
    if (!roleId) {
      return {
        errorMessage: 'Provided role ID link was empty',
        wasSuccessful: false,
      };
    }

    return {
      parsedValue: roleId,
      wasSuccessful: true,
    };
  }

  public async isValid(
    value: string,
    server: Server
  ): Promise<ValidityResultType> {
    if (!value) {
      return {
        errorMessage: 'No role ID was provided.',
        isValid: false,
      };
    }

    const role = server.getRole(value);
    if (!role) {
      return {
        errorMessage:
          'No role with that provided ID exists within this server.',
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

    const role = server.getRole(value);
    if (!role) {
      return {
        multilineCodeBlock: '(None)',
        regularChat: '(None)',
      };
    }

    return {
      multilineCodeBlock: `@${role.name}`,
      regularChat: `${ROLE_LINK_PREFIX}${value}${ROLE_LINK_SUFFIX}`,
    };
  }
}

export const RoleTypeDefinition = new RoleTypeDefinitionImplementation();
export default RoleTypeDefinition;
