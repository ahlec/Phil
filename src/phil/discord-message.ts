import { Phil } from './phil';
import { Server as DiscordIOServer, User as DiscordIOUser } from 'discord.io';
import { OfficialDiscordMessage, OfficialDiscordPayload } from 'official-discord';
import { ServerConfig } from './server-config';

export class DiscordMessageMention {
    constructor(public userId : string, public user : string, public userDiscriminator : string) {
    }
};

export class DiscordMessage {
    public readonly id : string;
    public readonly channelId : string;
    public readonly user : DiscordIOUser;
    public readonly userId : string;
    public readonly content : string;
    public readonly server? : DiscordIOServer;
    public readonly mentions : DiscordMessageMention[];

    private constructor(event : OfficialDiscordPayload<OfficialDiscordMessage>,
        phil : Phil,
        public readonly serverConfig : ServerConfig,
        public readonly isDirectMessage : boolean) {

        this.mentions = [];
        for (let mention of event.d.mentions) {
            this.mentions.push({
                userId: mention.id,
                user: mention.username,
                userDiscriminator: mention.discriminator // ie, #3787
            });
        }

        this.id = event.d.id;
        this.channelId = event.d.channel_id;
        this.userId = event.d.author.id;
        this.user = phil.bot.users[this.userId];
        this.content = event.d.content;

        if (!isDirectMessage) {
            this.server = this.serverConfig.server;
        }
    }

    static async parse(event : OfficialDiscordPayload<OfficialDiscordMessage>, phil : Phil)
        : Promise<DiscordMessage> {
        const isDirectMessage = (event.d.channel_id in phil.bot.directMessages);
        var serverConfig : ServerConfig;
        if (!isDirectMessage) {
            var server = phil.getServerFromChannelId(event.d.channel_id);
            serverConfig = await phil.serverDirectory.getServerConfig(server);
        }

        return new DiscordMessage(event, phil, serverConfig, isDirectMessage);
    }
}
