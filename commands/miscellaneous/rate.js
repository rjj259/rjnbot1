const { dbQuery, dbQueryAll, dbModify, dbQueryNoNew } = require("../../utils/db");
const { Rating } = require("../../utils/schemas");
const Discord = require("discord.js");
const config = require("../../config.json");
const fs = require("fs");

const questions = [
    "How many stars would you like to give? (⭐⭐⭐⭐⭐)",
    "Tell us how your experience was during the commission!"
];

module.exports = {
    name: "rate",
    category: "miscellaneous",
    description: "Leave a rating.",
    usage: [],
    aliases: [],
    cooldown: 0,
    run: async (bot, message, args) => {
        if (bot.active.has(message.author.id)) return;

        let perms = await dbQuery("AllowedUsers", { guild: message.guild.id });
        if (!perms.users.includes(message.author.id)) return;

        const responses = [];

        async function awaitMessages(msg, filter) {
            return msg.channel.awaitMessages({
                filter,
                max: 1,
                time: bot.config.promptTimeout,
                errors: ["time"]
            })
                .then(async (collected) => {
                    return collected.first();
                })
                .catch(async () => {
                    await msg.channel.send("Timeout reached (300s).")
                        .catch(() => false);

                    bot.active.delete(message.author.id);
                })
        }

        const mainEmbed = new Discord.MessageEmbed()
            .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
            .setColor(bot.config.colors.green)

        async function prompt(value) {
            bot.active.set(message.author.id);

            switch (value) {
                case 0: {
                    let msg = await message.author.send({ embeds: [mainEmbed.setDescription(questions[0])] })
                        .catch(() => {
                            message.reply({ embeds: [bot.logger.err("I was unable to send you a message, make sure your DMs are unlocked.")] })
                            return false;
                        })

                    let filter = (m) => {
                        return m.attachments.size === 0 && m.author.id === message.author.id
                    }

                    let returnCollect = await awaitMessages(msg, filter);
                    if (returnCollect?.content) {
                        if (isNaN(returnCollect.content)) {
                            message.author.send({ embeds: [bot.logger.err("Response must be a number between 1 and 5")] });
                            return prompt(0);
                        }

                        if (Number(returnCollect.content) > 5 || Number(returnCollect.content) < 1) {
                            message.author.send({ embeds: [bot.logger.err("Response must be a number between 1 and 5")] });
                            return prompt(0);
                        }

                        if (returnCollect.content.toLowerCase() === "cancel") {
                            message.author.send("Cancelled prompt");
                            bot.active.delete(message.author.id);
                            return;
                        }

                        responses.push(returnCollect.content);
                        return prompt(1);
                    } else return;
                }

                case 1: {
                    let msg = await message.author.send({ embeds: [mainEmbed.setDescription(questions[1])] })
                        .catch(() => {
                            message.reply({ embeds: [bot.logger.err("I was unable to send you a message, make sure your DMs are unlocked.")] })
                            return false;
                        })

                    let filter = (msg) => {
                        return msg.attachments.size === 0 && msg.author.id === message.author.id
                    }

                    let returnCollect = await awaitMessages(msg, filter)
                    if (returnCollect?.content) {
                        if (returnCollect.content.length > 2048) {
                            message.author.send({ embeds: [bot.logger.err("Your response is too long, make it shorter.")] });
                            return prompt(1);
                        }

                        if (returnCollect.content.toLowerCase() === "cancel") {
                            message.author.send("Cancelled prompt");
                            bot.active.delete(message.author.id);
                            return;
                        }

                        responses.push(returnCollect.content);
                        return prompt(2);
                    } else return;
                }

                case 2: {
                    const filter = i => {
                        return [`yes_${message.id}`, `no_${message.id}`].includes(i.customId) && i.user.id === message.author.id;
                    }

                    const row = new Discord.MessageActionRow()
                        .addComponents(
                            new Discord.MessageButton()
                                .setCustomId(`yes_${message.id}`)
                                .setStyle("SUCCESS")
                                .setLabel("Yes"),

                            new Discord.MessageButton()
                                .setCustomId(`no_${message.id}`)
                                .setStyle("DANGER")
                                .setLabel("No")
                        )

                    let msg = await message.author.send({
                        embeds: [mainEmbed
                            .setDescription("")
                            .setTitle("Are you sure you want to leave this rating?")
                            .addFields(
                                { name: questions[0], value: calculateRating(Number(responses[0])) },
                                { name: questions[1], value: responses[1] }
                            )
                        ], components: [row]
                    })
                        .catch(() => {
                            message.reply({ embeds: [bot.logger.err("I was unable to send you a message, make sure your DMs are unlocked.")] })
                            return false;
                        })

                    const collector = msg.createMessageComponentCollector({ filter, time: bot.config.promptTimeout })

                    collector.on("collect", async (i) => {
                        //collector.end();
                        bot.active.delete(message.author.id);
                        row.components[0].setDisabled(true);
                        row.components[1].setDisabled(true);

                        if (i.customId === `yes_${message.id}`) {
                            i.update({ embeds: [mainEmbed.setTitle(`Your rating has been sent!`)], components: [row] });

                            let totalRatings = await Rating.countDocuments();

                            await new Rating({
                                guild: message.guild.id,
                                user: message.author.id,
                                rating: Number(responses[0]),
                                questions: questions,
                                responses: responses
                            }).save();

                            let embed = new Discord.MessageEmbed()
                                .setColor(bot.config.colors.green)
                                .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                                .setTimestamp()
                                .addField(questions[0], calculateRating(responses[0]))
                                .addField(questions[1], responses[1])

                            let ratingsChannel = message.guild.channels.cache.find(c => c.name === bot.config.ratingsChannel);
                            await ratingsChannel.send({ embeds: [embed] });

                            ratingsChannel.messages.fetch(bot.config.lastMessageId)
                                .then(async (msg) => {
                                    await msg.delete()
                                        .catch(() => false);
                                })
                                .catch(() => false);

                            let ratings = await dbQueryAll("Rating", { guild: message.guild.id });
                            let total = ratings.map(data => data.rating).reduce((a, b) => a + b);
                            let averageRating = total / ratings.length;

                            let ratingEmbed = new Discord.MessageEmbed()
                                .setColor(bot.config.colors.green)
                                .setTitle("Average Rating")
                                .setDescription(`${calculateRating(averageRating)} (${averageRating})`)

                            let averageRatingMessage = await ratingsChannel.send({ embeds: [ratingEmbed] });
                            config.lastMessageId = averageRatingMessage.id;
                            fs.writeFile("./config.json", JSON.stringify(config, null, 2), function writeJSON(err) {
                                if (err) console.log(err);
                            })
                        } else if (i.customId === `no_${message.id}`) {
                            i.update({ embeds: [mainEmbed.setTitle(`Your rating has been cancelled.`).setColor(bot.config.colors.red)], components: [row] });
                        }
                    })
                }
            }
        }

        prompt(0);
    }
}

function roundToHalf(value) {
    let converted = parseFloat(value);
    let decimal = (converted - parseInt(converted, 10));
    decimal = Math.round(decimal * 10);

    if (decimal == 5) { return (parseInt(converted, 10) + 0.5); }

    if ((decimal < 3) || (decimal > 7)) {
        return Math.round(converted);
    } else {
        return (parseInt(converted, 10) + 0.5);
    }
}

function calculateRating(num) {
    num = roundToHalf(num);

    let star = config.emojis.star;
    let halfstar = config.emojis.halfstar;
    let rating = "";

    if (num === 0.5) {
        rating = halfstar;
    } else if (num === 1) {
        rating = star;
    } else if (num === 1.5) {
        rating = star + halfstar;
    } else if (num === 2) {
        rating = star + star;
    } else if (num === 2.5) {
        rating = star + star + halfstar;
    } else if (num === 3) {
        rating = star + star + star;
    } else if (num === 3.5) {
        rating = star + star + star + halfstar;
    } else if (num === 4) {
        rating = star + star + star + star;
    } else if (num === 4.5) {
        rating = star + star + star + star + halfstar;
    } else if (num === 5) {
        rating = star + star + star + star + star;
    }

    return rating;
}