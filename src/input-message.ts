import ServerConfig from './server-config';

export default class InputMessage {
  public static parseFromMessage(
    serverConfig: ServerConfig,
    message: string
  ): InputMessage | null {
    if (!message || message === '') {
      return null;
    }

    const words = message.split(' ').filter(word => word.trim().length > 0);
    if (!words.length) {
      return null;
    }

    const prompt = words[0].toLowerCase();
    if (!prompt.startsWith(serverConfig.commandPrefix)) {
      return null;
    }

    const commandName = prompt.substr(serverConfig.commandPrefix.length);
    return new InputMessage(commandName, words.slice(1));
  }

  private constructor(
    public readonly commandName: string,
    public readonly commandArgs: ReadonlyArray<string>
  ) {}
}
