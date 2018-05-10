const assert = require('assert');

export class GlobalConfig {
    public readonly discordBotToken : string;
    public readonly port : number;
    public readonly databaseUrl : string;
    public readonly youtubeApiKey : string;

    private constructor() {
        this.discordBotToken = GlobalConfig.getRequiredString('DISCORD_BOT_TOKEN');
        this.port = GlobalConfig.getRequiredNumber('PORT');
        this.databaseUrl = GlobalConfig.getRequiredString('DATABASE_URL');
        this.youtubeApiKey = GlobalConfig.getRequiredString('YOUTUBE_API_KEY');
    }

    public static retrieve() : GlobalConfig {
        return new GlobalConfig();
    }

    static getRequiredString(key : string) : string {
        const value : string = process.env[key];
        assert.ok(value, 'The environment variable `' + key + '` does not exist.');
        return value;
    }

    static getRequiredNumber(key : string) : number {
        const strValue = process.env[key];
        assert.ok(strValue, 'The environment variable `' + key + '` does not exist.');

        const value = parseInt(strValue);
        if (isNaN(value)) {
            throw new Error('The environment variable `' + key + '` is not able to be parsed as a number.');
        }

        return value;
    }
}
