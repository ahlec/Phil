declare module 'phil-DEPRECATED' {
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
}
