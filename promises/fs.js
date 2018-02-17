'use strict';

const fs = require('fs');

function _performReaddirPromise(resolve, reject, directory) {
    fs.readdir(directory, (err, filenames) => {
        if (err) {
            reject(err);
        } else {
            resolve(filenames);
        }
    });
}

module.exports = {
    readdir: function(directory) {
        return new Promise((resolve, reject) => _performReaddirPromise(resolve, reject, directory));
    }
};
