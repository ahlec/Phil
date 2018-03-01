'use strict';

import { Database } from './database';
import { QueryResult } from 'pg';
import { Role as DiscordIORole, Server as DiscordIOServer } from 'discord.io';

export class Requestable {
    constructor(public readonly role : DiscordIORole, public readonly requestStrings : string[]) {
    }

    static checkIsValidRequestableName(name : string) : boolean {
        // Only alphanumeric (with dashes) and must be 2+ characters in length
        return /^[A-Za-z0-9\-]{2,}$/.test(name);
    }

    static async getAllRequestables(db : Database, server : DiscordIOServer) : Promise<Requestable[]> {
        const results = await db.query('SELECT request_string, role_id FROM requestable_roles');
        const groupedRequestStrings = this.groupRequestStrings(results);
        const requestables = [];
        for (let roleId in groupedRequestStrings) {
            const role = server.roles[roleId];
            if (role === undefined || role === null) {
                continue;
            }

            requestables.push(new Requestable(role, groupedRequestStrings[roleId]));
        }

        return requestables;
    }

    static async getFromRequestString(db : Database, server : DiscordIOServer, requestString : string) : Promise<Requestable> {
        requestString = requestString.toLowerCase();
        const results = await db.query('SELECT role_id FROM requestable_roles WHERE request_string = $1', [requestString]);

        if (results.rowCount === 0) {
            return null;
        }

        const roleId = results.rows[0].role_id;
        const role = server.roles[roleId];
        if (!role || role === null) {
            throw new Error('There is still a requestable role by the name of `' + requestString + '` defined for the server, but it doesn\'t exist anymore in Discord\'s list of roles. An admin should remove this.');
          }

        return new Requestable(role, []); // TODO: We need to get the list of request strings here!!
    }

    static async createRequestable(db : Database, role : DiscordIORole, requestString : string) : Promise<void> {
        await db.query('INSERT INTO requestable_roles VALUES($1, $2)', [requestString, role.id]);
    }

    private static groupRequestStrings(results : QueryResult) : { [roleId : string] : string[] } {
        const groupedRequestStrings : { [roleId : string] : string[] } = {};
        for (let index = 0; index < results.rowCount; ++index) {
            const roleId = results.rows[index].role_id;
            if (groupedRequestStrings[roleId] === undefined) {
                groupedRequestStrings[roleId] = [];
            }

            groupedRequestStrings[roleId].push(results.rows[index].request_string);
        }

        return groupedRequestStrings;
    }
}
