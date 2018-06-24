import { User as DiscordIOUser } from 'discord.io';
import { OfficialDiscordMessage, OfficialDiscordPayload } from 'official-discord';
import Phil from 'phil';

export interface IMention {
    readonly userId: string;
    readonly user: string;
    readonly userDiscriminator: string;
}

export abstract class MessageBase {
    public readonly id: string;
    public readonly channelId: string;
    public readonly user: DiscordIOUser;
    public readonly userId: string;
    public readonly content: string;
    public readonly mentions: IMention[];

    constructor(event: OfficialDiscordPayload<OfficialDiscordMessage>, phil: Phil) {
        this.mentions = [];
        for (const mention of event.d.mentions) {
            this.mentions.push({
                user: mention.username,
                userDiscriminator: mention.discriminator, // ie, #3787
                userId: mention.id
            });
        }

        this.id = event.d.id;
        this.channelId = event.d.channel_id;
        this.userId = event.d.author.id;
        this.user = phil.bot.users[this.userId];
        this.content = event.d.content;
    }
}

export default MessageBase;
