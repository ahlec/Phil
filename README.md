# PhilTheYeti

Phil is a Node.js Disord bot who was designed specific for the [Official HiJack Server](https://discordapp.com/invite/3RZVTAj). Originally, the bot started out with two purposes:

1. Reduce the number of bots that we were using for one-off purposes (having a bot on the server just to get a single function from them);
2. Manage the daily writing prompts, both allowing users to suggest new prompts and then posting the prompt for the day automatically.
	
Over time, Phil's functionality and usefulness began to grow and he's been given more and more duties on the server.

Phil also served as a useful reentry point to working with Javascript. It's been a number of years since I've worked on a large Javascript project, and I've never really worked with Node.js before, so Phil was a great learning project for figuring out how to structure a Node.js project, how to run a Node.js project and deploy one, and then how to work with the latest in ECMAScript 7.

## Running

Phil is designed to be run/hosted on [Heroku](https://heroku.com). Running him locally is also definitely possible as part of the [Heroku Toolbelt](https://toolbelt.heroku.com/). There are a couple of dependencies that you'll need to run him, but they're all pretty standard run-of-the-mill.

* Node.js
* Heroku
* npm
* Postgres

Installing all of the necessary packages to run phil is as simple as just running `npm install`.

To set up the database, you'll want to create a new table in Postgres and then run all of the .sql files that are in the database/ directory in order. It's not too difficult, and each subsequent file is meant as a patch against the base one. Pretty straightforward.

Lastly, if you're going to run locally (or remotely) you'll need to set up your environment variables using various IDs from Discord. You can't run Phil without having all of the environment variables declared. You can check all of them in `phil/environment_manager.js` in the function `_assertEnvironmentVariables`. It's pretty inflexible because we've got a known exclusive end user for Phil. If Phil were ever meant to be a reusable bot (which maybe one day, who knows), the environment variables will change at that time.

You'll need to register a bot account for Discord. That's pretty simple and can be done [here](https://discordapp.com/developers/applications/me). You'll also need a Heroku account. A free one is more than enough, though I'd recommend putting in your credit card information. Phil will never require services that will charge you any money, and Heroku definitely seems to be on the up-and-up about it. The only reason I suggest registering your credit card is it'll massively bump the number of hours that your account can have stuff hosted to 1,000 hours per month, which 31 days * 24 hours/day = 744 hours per month (744 < 1000, usually), which guarantees you that Phil will never go down partway through the month.

Here's (more or less) a flow to get Phil started locally. It'll probably need some individual tweaking, but this gives you the general idea I think:

```
git clone git@github.com:ahlec/Phil.git
cd Phil
cd database
psql -f database.sql
psql -f database-v2.sql
psql -f database-v3.sql
[continue for further versions]
cd ..
[take a moment now and configure your .env file]
npm install
heroku local web
```

This will launch Phil running from your local machine. Subsequently, you can get Phil running using just `heroku local web`.

When it comes time to push him to Heroku and have him running on the cloud rather than on your local machine, you simply need to `git push heroku master` and it'll push everything in your git repo to the live environment on Heroku. It WON'T push your .env file, though, so you'll need to configure your environment variables on Heroku. Easiest way to do that is just using their dashboard to modify them.

## Components

Phil is made up of a couple of different components. I won't go into all of the details about what makes Phil tick, because more or less it's straightforward (well, as straight-forward as reading through anybody else's source code ever is). However, there are some constructs that I'd like to touch upon.

**Commands**. These are the most obvious of the components. Commands are any function that a user is capable of invoking by using the command prefix + the name of a command (ie `p!prompt` or `p!help` if the command prefix is `p!`). Commands can be run in direct messages, but will most commonly happen in the server itself. They're functions that require someone explicitly triggering them to happen.

**Chronos**. "Chronos" is actually the plural; an individual one of these is a **chrono**. Chronos are Phil's equivalent of a chron job. It's something that Phil will run at a certain point in time to perform some kind of action. Some of these can be posting something on a regular interval in the chat; others can be performing some kind of cleanup operation on a routine basis. Unlike commands, individual chronos cannot be triggered or named by any user, and they happen even if nobody says anything (they're based on time rather than on user input). These grew out of the original foundation for posting a new daily prompt. Added in [Version 2](https://github.com/ahlec/Phil/commit/e58552001312a5cda42ce99d671a2e3f5c6ebee9).

**Analyzers**. Analyzers are the flip side of a coin from commands. Both commands and analyzers react to a user posting a message in a server. However, commands are invoked by naming the specific command that you want. It's a very explicit process. Analyzers work just the opposite. If a message that a user sends is not a command, it gets passed over to the analyzers. Analyzers can example any message that isn't a command that a user sends and react to them. It's a very implicit process. They might look for particular trigger words in order to provide a response to them, or they'll do some kind of data analysis on the message. This system was first added in [Version 8](https://github.com/ahlec/Phil/commit/8c68373a3874fd08ca97974f376d5dbeb844d8c2).
