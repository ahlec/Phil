interface InternalUser {
  bot: boolean;
  username: string;
}

class User {
  public constructor(
    private readonly internalUser: InternalUser,
    public readonly id: string
  ) {}

  public get isBot(): boolean {
    return this.internalUser.bot;
  }

  public get username(): string {
    return this.internalUser.username;
  }
}

export default User;
