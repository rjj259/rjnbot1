const { bot } = require("../../index");

module.exports = async () => {
    try {
        const promises = bot.guilds.cache.map(guild => guild.available ? guild.members.fetch() : Promise.resolve());
        await Promise.all(promises);
    } catch (err) {
        console.log(`Failed to fetch all members before ready! ${err}\n${err.stack}`);
    }

    console.log(`Logged in as ${bot.user.username}`);
}