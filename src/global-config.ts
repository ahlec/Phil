const assert = require('assert');

function getRequiredString(key : string) : string {
    const value : string = process.env[key];
    assert.ok(value, 'The environment variable `' + key + '` does not exist.');
    return value;
}

function getRequiredNumber(key : string) : number {
    const strValue = process.env[key];
    assert.ok(strValue, 'The environment variable `' + key + '` does not exist.');

    const value = parseInt(strValue, 10);
    if (isNaN(value)) {
        throw new Error('The environment variable `' + key + '` is not able to be parsed as a number.');
    }

    return value;
}

export default class GlobalConfig {
    public readonly discordBotToken : string;
    public readonly port : number;
    public readonly databaseUrl : string;
    public readonly youtubeApiKey : string;
    public readonly botManagerUserId : string;
    public readonly maxCommandPrefixLength = 5;

    constructor() {
        this.discordBotToken = getRequiredString('DISCORD_BOT_TOKEN');
        this.port = getRequiredNumber('PORT');
        this.databaseUrl = getRequiredString('DATABASE_URL');
        this.youtubeApiKey = getRequiredString('YOUTUBE_API_KEY');
        this.botManagerUserId = getRequiredString('BOT_MANAGER_USER_ID');
    }
}
