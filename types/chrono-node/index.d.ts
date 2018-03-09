declare module 'chrono-node' {
    import { Moment } from 'moment';

    export type Component = 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second' | 'timezoneOffset';

    export interface ParsedComponent {
        assign(component : Component, value : any) : void;
        imply(component : Component, value : any) : void;
        get(component : Component) : any;
        isCertain(component : Component) : boolean;
        date() : Date;
        moment() : Moment;

        clone() : ParsedComponent;
    }

    export interface DetailedResults {
        readonly start : ParsedComponent;
        readonly end? : ParsedComponent;
        readonly index : number;
        readonly text : string;
        readonly ref : Date;
    }

    export function parseDate(input : string) : Date;
    export function parse(input : string) : DetailedResults[];
}
