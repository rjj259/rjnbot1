const Discord = require("discord.js");

module.exports = {
    name: "create",
    category: "tickets",
    description: "Create a ticket.",
    usage: [],
    aliases: [],
    cooldown: 0,
    run: async (bot, message, args) => {
        let ticketChannel = message.guild.channels.cache.find(c => c.name === `ticket-${message.author.id}`);
        if (ticketChannel) return message.reply({ embeds: [bot.logger.err(`You already have a ticket channel open. (<#${ticketChannel.id}>)`)] });

        message.guild.channels.create(`ticket-${message.author.id}`, {
            parent: bot.config.ticketsCategory,
            reason: `Ticket opened by ${message.author.tag}`,
            permissionOverwrites: [
                {
                    id: message.guild.id,
                    deny: ["VIEW_CHANNEL"]
                },
                {
                    id: message.author.id,
                    allow: ["VIEW_CHANNEL", "SEND_MESSAGES"]
                }
            ]
        })
            .then(channel => {
                message.reply({ embeds: [bot.logger.success(`Your ticket has been created. (<#${channel.id}>)`)] });
            })
    }
}