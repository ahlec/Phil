/* eslint-disable no-console */
import LoggerDefinition from './LoggerDefinition';

export default abstract class Logger {
  protected constructor(protected readonly definition: LoggerDefinition) {}

  protected write(msg: string): void {
    console.log(this.definition.prefix, msg);
  }

  protected warn(msg: string): void {
    console.warn(this.definition.prefix, msg);
  }

  protected error(err: string | Error): void {
    if (!err) {
      this.error(new Error('Called Logger.error without providing an error.'));
      return;
    }

    if (typeof err === 'string') {
      console.error(this.definition.prefix, err);
      return;
    }

    const identifier = `{${err.name}}`;
    console.error(this.definition.prefix, identifier, err.message);
    if (err.stack) {
      const stackTrace = err.stack.split('\n');
      stackTrace.forEach((line) =>
        console.error(this.definition.prefix, identifier, '\t', line.trim())
      );
    } else {
      console.error(this.definition.prefix, identifier, '<no stack trace>');
    }
  }
}
