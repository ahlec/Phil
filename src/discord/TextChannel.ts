import Server from './Server';

class TextChannel {
  public constructor(
    public readonly server: Server,
    public readonly id: string
  ) {}
}

export default TextChannel;
