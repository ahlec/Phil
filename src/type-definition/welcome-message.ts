import { truncateString } from '../utils';
import {
  ParseResult,
  TypeDefinition,
  ValidityResultType,
} from './@type-definition';

const MAX_CHARACTER_LIMIT = 1800; // Limit is actually 2000, but need to leave room to account for character names
const DISPLAY_CHARACTER_LIMIT = 200;

class WelcomeMessageTypeDefinitionImplementation implements TypeDefinition {
  public readonly rules = [
    `Must be ${MAX_CHARACTER_LIMIT} characters or less.`,
  ];

  public tryParse(input: string): ParseResult {
    if (!input || !input.trim()) {
      return {
        errorMessage: 'Input was undefined, null, empty, or whitespace',
        wasSuccessful: false,
      };
    }

    if (input.length > MAX_CHARACTER_LIMIT) {
      return {
        errorMessage: `Input was more than the max character limit of ${MAX_CHARACTER_LIMIT} characters.`,
        wasSuccessful: false,
      };
    }

    return {
      parsedValue: input,
      wasSuccessful: true,
    };
  }

  public isValid(): ValidityResultType {
    return {
      isValid: true,
    };
  }

  public toDisplayFormat(value: string | null): string {
    if (!value) {
      return '(None)';
    }

    let truncated = truncateString(value, DISPLAY_CHARACTER_LIMIT);
    const omittedTextLength = value.length - truncated.length;
    if (omittedTextLength > 0) {
      truncated += `... (and ${omittedTextLength} more character${omittedTextLength !==
        1 && 's'})`;
    }

    return truncated;
  }

  public toMultilineCodeblockDisplayFormat(value: string | null): string {
    return this.toDisplayFormat(value);
  }
}

export const WelcomeMessageTypeDefinition = new WelcomeMessageTypeDefinitionImplementation();
export default WelcomeMessageTypeDefinition;
