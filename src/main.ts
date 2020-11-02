/* eslint-disable no-console */

import Client from '@phil/discord/Client';

import Database from './database';
import { ensureNecessaryEnvironmentVariables } from './environment-manager';
import GlobalConfig from './GlobalConfig';
import Phil from './phil';
import WebPortal from './WebPortal';

async function main(): Promise<void> {
  try {
    ensureNecessaryEnvironmentVariables();

    const db = new Database();
    if (!(await db.checkIsCurrentVersion())) {
      return;
    }

    const discordClient = await Client.connect(GlobalConfig.discordBotToken);
    const { botUser } = discordClient;
    console.log(
      `Logged in as ${botUser.fullUsername} (snowflake: ${botUser.id})`
    );

    new Phil(discordClient, db);

    const webPortal = new WebPortal();
    webPortal.start();
    webPortal.beginKeepAliveHeartbeat();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
