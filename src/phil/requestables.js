'use strict';

function _onGetAllRequestablesDbError(err) {
    return Promise.reject('There was a database error when attempting to get all of the requestable roles. `' + err + '`');
}

function _groupdDbResultsByRoleId(results) {
    const groupedRequestables = {};

    for (let index = 0; index < results.rowCount; ++index) {
        const roleId = results.rows[index].role_id;
        if (groupedRequestables[roleId] === undefined) {
            groupedRequestables[roleId] = [];
        }

        groupedRequestables[roleId].push(results.rows[index].request_string);
    }

    return groupedRequestables;
}

function _getRequestablesData(groupedRequestables, server) {
    const requestables = [];

    for (let roleId in groupedRequestables) {
        const role = server.roles[roleId];
        if (role === undefined || role === null) {
            continue;
        }

        requestables.push({
            roleId: roleId,
            roleName: role.name,
            requestStrings: groupedRequestables[roleId]
        });
    }

    return requestables;
}

function _onGetRoleFromDbError(err) {
    return Promise.reject('There was a database error when attempting to look up the request string. `' + err + '`');
}

function _getRoleFromDbResults(results, requestable, server) {
    if (results.rowCount === 0) {
        return Promise.reject('There was no requestable role by the name of `' + requestable + '`. Use `' + process.env.COMMAND_PREFIX + 'request` by itself to see a full list of valid requestable roles.');
    }

    const roleId = results.rows[0].role_id;
    const role = server.roles[roleId];
    if (role === undefined || role === null) {
        return Promise.reject('There is still a requestable role by the name of `' + requestable + '` defined for the server, but it doesn\'t exist anymore in Discord\'s list of roles. An admin should remove this.');
    }

    return role;
}

function _onCreateDbError(err) {
    return Promise.reject('Database error when attempting to create the requestable. `' + err + '`');
}

module.exports = {
    getAllRequestables: function(db, server) {
        return db.query('SELECT request_string, role_id FROM requestable_roles')
            .catch(_onGetAllRequestablesDbError)
            .then(_groupdDbResultsByRoleId)
            .then(groupedRequestables => _getRequestablesData(groupedRequestables, server));
    },

    getRoleFromRequestable: function(requestable, db, server) {
        return db.query('SELECT role_id FROM requestable_roles WHERE request_string = $1', [requestable.toLowerCase()])
            .catch(_onGetRoleFromDbError)
            .then(results => _getRoleFromDbResults(results, requestable, server));
    },

    doesRequestableExist: function(requestable, db) {
        return db.query('SELECT count(request_string) FROM requestable_roles WHERE request_string = $1', [requestable])
            .then(results => (results.rows[0].count > 0));
    },

    createRequestable: function(data, db) {
        return db.query('INSERT INTO requestable_roles VALUES($1, $2)', [data.requestString, data.roleId])
            .catch(_onCreateDbError)
            .then(() => data);
    }
};
