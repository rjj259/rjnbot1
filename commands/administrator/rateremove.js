const { dbQuery, dbModify } = require("../../utils/db");
const Discord = require("discord.js");

module.exports = {
    name: "rateremove",
    category: "administrator",
    description: "Disallow a user to use the rate command.",
    usage: ["[user]"],
    aliases: [],
    cooldown: 0,
    run: async (bot, message, args) => {
        if (
            !message.member.hasPermission("ADMINISTRATOR")
        ) return;

        if (!args[0]) return bot.commands.get("help").run(bot, message, ["rateremove"]);

        const member = bot.util.resolveMember(message, args[0]);
        if (!member) return message.reply({ embeds: [bot.logger.err(`Couldn't find user ${args[0]}`)] });

        const allowedUsers = await dbQuery("AllowedUsers", { guild: message.guild.id });

        if (!allowedUsers.users.includes(member.user.id)) return message.reply({ embeds: [bot.logger.info(`This user is already unable to use the command.`)] });

        const index = allowedUsers.users.indexOf(member.user.id);
        if (index > -1) {
            allowedUsers.users.splice(index, 1);
            await dbModify("AllowedUsers", { guild: message.guild.id }, allowedUsers);

            message.reply({ embeds: [bot.logger.success(`${member.user.tag} is no longer able to use the rate command.`)] });
        }
    }
}