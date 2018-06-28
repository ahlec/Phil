const express = require('express');
import GlobalConfig from './global-config';
import { BotUtils } from './utils';

export default class WebPortal {
    private app: any;

    constructor() {
        this.app = express();
        this.app.set('view engine', 'ejs');
        this.app.use(express.static('../assets'));
        this.app.get('/', this.receiveWebRequest.bind(this));
    }

    public start() {
        this.app.listen(GlobalConfig.port, this.onListen.bind(this));
    }

    public beginKeepAliveHeartbeat() {
        // Ping the server every 12 minutes so that the Heroku dynos won't fall asleep
        setInterval(this.onKeepAliveHeartbeat.bind(this), 1000 * 60 * 12);
    }

    public onListen() {
        console.log('Web portal is running on port ' + GlobalConfig.port);
    }

    public receiveWebRequest(request: any, response: any) {
        response.render('index');
    }

    public onKeepAliveHeartbeat() {
        BotUtils.getUrl(process.env.PUBLIC_APP_URL);
    }
};
