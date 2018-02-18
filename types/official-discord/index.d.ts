declare module 'official-discord' {

    export enum OfficialDiscordMessageType {
        Default = 0,
        RecipientAdd = 1,
        RedicipientRemove = 2,
        Call = 3,
        ChannelNameChange = 4,
        ChannelIconChange = 5,
        ChannelPinnedMessage = 6,
        GuildMemberJoin = 7
    }

    export class OfficialDiscordUser {
        readonly id : string;
        readonly username : string;
        readonly discriminator : string;
        readonly avatar? : string;
        readonly bot? : boolean;
        readonly mfa_enabled? : boolean;
        readonly verified? : boolean;
        readonly email? : string;
    }

    export class OfficialDiscordMessage {
        readonly id : string;
        readonly channel_id : string;
        readonly author? : OfficialDiscordUser;
        readonly content : string;
        readonly timestamp : Date;
        readonly edited_timestamp : Date;
        readonly tts : boolean;
        readonly mention_everyone : boolean;
        readonly mentions : OfficialDiscordUser[];
        readonly pinned : boolean;
        readonly type : OfficialDiscordMessageType;
    }

    export class OfficialDiscordPayload<TEventData> {
        readonly op : number;
        readonly d : TEventData;
        readonly s : number;
        readonly t : string;
    }
}
