const { dbQuery, dbModify } = require("../../utils/db");
const Discord = require("discord.js");

module.exports = {
    name: "rateadd",
    category: "administrator",
    description: "Allow a user to use the rate command.",
    usage: ["[user]"],
    aliases: [],
    cooldown: 0,
    run: async (bot, message, args) => {
        if (
            !message.member.hasPermission("ADMINISTRATOR")
        ) return;

        if (!args[0]) return bot.commands.get("help").run(bot, message, ["rateadd"]);

        const member = bot.util.resolveMember(message, args[0]);
        if (!member) return message.reply({ embeds: [bot.logger.err(`Couldn't find user ${args[0]}`)] });

        const allowedUsers = await dbQuery("AllowedUsers", { guild: message.guild.id });

        if (allowedUsers.users.includes(member.user.id)) return message.reply({ embeds: [bot.logger.info(`This user already has permissions to use the command.`)] });

        allowedUsers.users.push(member.user.id);
        await dbModify("AllowedUsers", { guild: message.guild.id }, allowedUsers);

        message.reply({ embeds: [bot.logger.success(`${member.user.tag} is now able to use the rate command.`)] });
    }
}