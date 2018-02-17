'use strict';

const botUtils = require('../phil/utils');
const express = require('express');

export class WebPortal {
    private _app: any;

    constructor() {
        this._app = express();
        this._app.set('view engine', 'ejs');
        this._app.use(express.static('../assets'));
        this._app.get('/', this._receiveWebRequest.bind(this));
    }

    start() {
        this._app.listen(process.env.PORT, this._onListen.bind(this));
        return this;
    }

    beginKeepAliveHeartbeat() {
        // Ping the server every 12 minutes so that the Heroku dynos won't fall asleep
        setInterval(this._onKeepAliveHeartbeat.bind(this), 1000 * 60 * 12);
    }

    _onListen() {
        console.log('Web portal is running on port ' + process.env.PORT);
    }

    _receiveWebRequest(request: any, response: any) {
        response.render('index');
    }

    _onKeepAliveHeartbeat() {
        botUtils.getUrl(process.env.PUBLIC_APP_URL);
    }
};
