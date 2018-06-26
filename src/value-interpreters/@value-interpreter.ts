import Phil from '../phil';
import ServerConfig from '../server-config';

interface IParseSuccess<TType> {
    wasSuccessful: true;
    parsedValue: TType;
}

interface IParseFailure {
    wasSuccessful: false;
    errorMessage: string;
}

export type ParseResult<TType> = IParseSuccess<TType> | IParseFailure;

export interface IValueInterpreter<TType> {
    tryParse(input: string, phil: Phil, serverConfig: ServerConfig): ParseResult<TType>;
    isValid(value: TType, phil: Phil, serverConfig: ServerConfig): boolean;
}
