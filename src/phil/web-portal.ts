'use strict';

import { BotUtils } from './utils';
import { GlobalConfig } from './global-config';
const express = require('express');

export class WebPortal {
    private _app: any;

    constructor(public readonly globalConfig : GlobalConfig) {
        this._app = express();
        this._app.set('view engine', 'ejs');
        this._app.use(express.static('../assets'));
        this._app.get('/', this._receiveWebRequest.bind(this));
    }

    start() {
        this._app.listen(this.globalConfig.port, this._onListen.bind(this));
    }

    beginKeepAliveHeartbeat() {
        // Ping the server every 12 minutes so that the Heroku dynos won't fall asleep
        setInterval(this._onKeepAliveHeartbeat.bind(this), 1000 * 60 * 12);
    }

    _onListen() {
        console.log('Web portal is running on port ' + this.globalConfig.port);
    }

    _receiveWebRequest(request: any, response: any) {
        response.render('index');
    }

    _onKeepAliveHeartbeat() {
        BotUtils.getUrl(process.env.PUBLIC_APP_URL);
    }
};
