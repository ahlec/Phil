import Server from '@phil/discord/Server';

interface ParseSuccess {
  wasSuccessful: true;
  parsedValue: string;
}

interface ParseFailure {
  wasSuccessful: false;
  errorMessage: string;
}

export type ParseResult = ParseSuccess | ParseFailure;

interface ValidResult {
  isValid: true;
}

interface InvalidResult {
  errorMessage: string;
  isValid: false;
}

export interface FormatResult {
  regularChat: string;
  multilineCodeBlock: string;
}

export type ValidityResultType = ValidResult | InvalidResult;

export interface TypeDefinition {
  readonly rules: ReadonlyArray<string>;
  tryParse(input: string): ParseResult;
  isValid(value: string, server: Server): Promise<ValidityResultType>;
  format(value: string | null, server: Server): Promise<FormatResult>;
}
