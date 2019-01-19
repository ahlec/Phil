export default abstract class Loggable {
  private readonly loggerPrefix: string;

  protected constructor(loggableName: string) {
    this.loggerPrefix = `[${loggableName}] `;
  }

  protected write(format: string, ...args: any[]) {
    console.log(this.loggerPrefix + format, ...args);
  }
}
