declare module 'discord.io' {

    export class User {
        readonly username : string;
        readonly id : string;
        readonly discriminator : number;
        readonly avatar : string;
        readonly bot : boolean;
        readonly game : any;
    }

    export class Client {
        constructor(constructArgs : any);

        readonly id : string;
        readonly username : string;
        readonly users : { [userId: string]: User };

        connect() : void;
        disconnect() : void;
        on(eventName : string,  callback : any) : void;
    }
}
