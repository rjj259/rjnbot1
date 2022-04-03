const Discord = require("discord.js");

module.exports = {
    name: "close",
    category: "tickets",
    description: "Close a ticket.",
    usage: [],
    aliases: [],
    cooldown: 0,
    run: async (bot, message, args) => {
        if (
            !message.member.hasPermission("ADMINISTRATOR")
        ) return;

        if(!message.channel.name.startsWith(`ticket-`) || message.channel.parentId !== bot.config.ticketsCategory) return message.reply({ embeds: [bot.logger.err("You can only delete ticket channels.")] });

        await message.channel.send({ embeds: [bot.logger.info("Channel will be deleted in a few seconds.")] });

        setTimeout(() => {
            message.channel.delete(`Ticket closed by ${message.author.tag}`);
        }, 5000);
    }
}