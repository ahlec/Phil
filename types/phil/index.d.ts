declare module 'phil' {
    import { User as DiscordIOUser,
             Server as DiscordIOServer,
             Channel as DiscordIOChannel,
             Role as DiscordIORole,
             Member as DiscordIOMember } from 'discord.io';

     export interface IValidateResult {
         isValid : boolean;
         invalidReason : string | null;
     }

     export interface IPronoun {
         readonly roleName : string;
         readonly displayName : string;
         readonly subject : string;
         readonly object : string;
         readonly possessive : string;
         readonly possessivePronoun : string;
         readonly reflexive : string;
     }

    export interface IServerConfig {
        readonly server : DiscordIOServer,
        readonly serverId : string;
        readonly commandPrefix : string;
        readonly botControlChannel : DiscordIOChannel;
        readonly adminChannel : DiscordIOChannel;
        readonly introductionsChannel : DiscordIOChannel;
        readonly newsChannel : DiscordIOChannel;
        readonly adminRole? : DiscordIORole;
        readonly welcomeMessage : string;
        readonly fandomMapLink : string;

        isAdmin(member : DiscordIOMember) : boolean;
        isAdminChannel(channelId : string) : boolean;
        getPronounsForMember(member: DiscordIOMember) : IPronoun;
        validateCommandPrefix(commandPrefix : string) : IValidateResult;
    }

    export interface IMention {
        readonly userId : string;
        readonly user : string;
        readonly userDiscriminator : string;
    }

    export interface IMessage {
        readonly id : string;
        readonly channelId : string;
        readonly user : DiscordIOUser;
        readonly userId : string;
        readonly content : string;
        readonly mentions : IMention[];
    }

    export interface IPrivateMessage extends IMessage {
    }

    export interface IPublicMessage extends IMessage {
        readonly server : DiscordIOServer;
        readonly serverConfig : IServerConfig;
    }
}
