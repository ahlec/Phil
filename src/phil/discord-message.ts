import { Phil } from './phil';
import { IMention, IMessage, IPublicMessage, IPrivateMessage, IServerConfig } from 'phil';
import { Server as DiscordIOServer, User as DiscordIOUser } from 'discord.io';
import { OfficialDiscordMessage, OfficialDiscordPayload } from 'official-discord';

abstract class MessageBase implements IMessage {
    public readonly id : string;
    public readonly channelId : string;
    public readonly user : DiscordIOUser;
    public readonly userId : string;
    public readonly content : string;
    public readonly mentions : IMention[];

    constructor(event : OfficialDiscordPayload<OfficialDiscordMessage>, phil : Phil) {
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
    }
}

class PrivateMessage extends MessageBase implements IPrivateMessage {
    constructor(event : OfficialDiscordPayload<OfficialDiscordMessage>, phil : Phil) {
        super(event, phil);
    }
}

class PublicMessage extends MessageBase implements IPublicMessage {
    readonly server : DiscordIOServer;

    constructor(event : OfficialDiscordPayload<OfficialDiscordMessage>,
        phil : Phil,
        public readonly serverConfig : IServerConfig) {
        super(event, phil);
        this.server = this.serverConfig.server;
    }
}

export namespace Message {
    export async function parse(phil : Phil, event : OfficialDiscordPayload<OfficialDiscordMessage>) : Promise<IMessage> {
        const isDirectMessage = (event.d.channel_id in phil.bot.directMessages);
        if (isDirectMessage) {
            return new PrivateMessage(event, phil);
        }

        const server = phil.getServerFromChannelId(event.d.channel_id);
        const serverConfig = await phil.serverDirectory.getServerConfig(server);
        return new PublicMessage(event, phil, serverConfig);
    }
}
