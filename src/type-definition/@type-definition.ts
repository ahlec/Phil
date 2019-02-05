import Phil from '../phil';
import ServerConfig from '../server-config';

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

export type ValidityResultType = ValidResult | InvalidResult;

export interface TypeDefinition {
  readonly rules: ReadonlyArray<string>;
  tryParse(input: string): ParseResult;
  isValid(
    value: string,
    phil: Phil,
    serverConfig: ServerConfig
  ): ValidityResultType;
  toDisplayFormat(value: string | null, serverConfig: ServerConfig): string;
  toMultilineCodeblockDisplayFormat(
    value: string | null,
    phil: Phil,
    serverConfig: ServerConfig
  ): string;
}
