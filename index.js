require("dotenv").config();
const { Client, Intents, GuildMember, Message, Collection } = require("discord.js");
const express = require("express");
const { readdirSync } = require("fs");

const { connect, connection } = require("mongoose");
const autoIncrement = require("mongoose-sequence");

const intents = new Intents(["GUILDS", "GUILD_MEMBERS", "GUILD_MESSAGES", "GUILD_MESSAGE_REACTIONS", "GUILD_VOICE_STATES", "GUILD_EMOJIS_AND_STICKERS", "GUILD_BANS", "GUILD_PRESENCES", "DIRECT_MESSAGES"]);

const bot = new Client({
    intents: intents,
    allowedMentions: { parse: ["users", "roles"], repliedUser: false }
});

module.exports = { bot };

connect(process.env.MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .catch(err => {
        console.log(`[DATABASE] Connection Error: ${err.stack}`);
    })
autoIncrement(connection);

connection.on("open", () => {
    console.log(`[DATABASE] Connected to MongoDB.`);
});

connection.on("error", (err) => {
    console.log(`[DATABASE] Error: ${err.stack}`);
});

const utils = require("./utils/util");
bot.util = new utils.Utils(bot, process.cwd());

bot.config = require("./config.json");
bot.logger = require("./utils/logger");
bot.active = new Collection();
bot.commands = new Collection();
bot.aliases = new Collection();
bot.categories = readdirSync("./commands/");
bot.cooldowns = new Collection();

["command", "event"].forEach(handler => {
    require(`./handlers/${handler}`)(bot);
});

GuildMember.prototype.hasPermission = function (permission) {
    return this.permissions.has(permission);
}

Message.prototype.delete = function (options = {}) {
    if (typeof options !== 'object') return Promise.reject(new TypeError('INVALID_TYPE', 'options', 'object', true));
    const { timeout = 0 } = options;
    if (timeout <= 0) {
        return this.channel.messages.delete(this.id).then(() => this);
    } else {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve(this.delete());
            }, timeout);
        });
    }
}

process.on("uncaughtException", (err) => console.log(err));
process.on("unhandledRejection", (err) => console.log(err));

bot.login(process.env.TOKEN);