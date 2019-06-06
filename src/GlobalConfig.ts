function getRequiredString(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`The environment variable '${key}' does not exist.`);
  }

  return value;
}

function getRequiredNumber(key: string): number {
  const strValue = getRequiredString(key);

  const value = parseInt(strValue, 10);
  if (Number.isNaN(value)) {
    throw new Error(
      `The environment variable '${key}' is not able to be parsed as a number.`
    );
  }

  return value;
}

class GlobalConfig {
  public readonly discordBotToken: string;
  public readonly webportalUrl: string;
  public readonly webportalPort: number;
  public readonly databaseUrl: string;
  public readonly youtubeApiKey: string;
  public readonly botManagerUserId: string;
  public readonly minCommandPrefixLength = 2;
  public readonly maxCommandPrefixLength = 5;
  public readonly hijackServerId: string;

  constructor() {
    this.discordBotToken = getRequiredString('DISCORD_BOT_TOKEN');
    this.webportalUrl = getRequiredString('PUBLIC_APP_URL');
    this.webportalPort = getRequiredNumber('PORT');
    this.databaseUrl = getRequiredString('DATABASE_URL');
    this.youtubeApiKey = getRequiredString('YOUTUBE_API_KEY');
    this.botManagerUserId = getRequiredString('BOT_MANAGER_USER_ID');
    this.hijackServerId = getRequiredString('HIJACK_SERVER_ID');
  }
}

export default new GlobalConfig();
