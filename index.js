// Require the necessary discord.js classes
const { Client, Intents, MessageEmbed } = require('discord.js');
const config = require('./config.json')
const { Manager } = require("erela.js")
const Spotify = require("erela.js-spotify")

const app = new Client({
    restTimeOffset: 0,
    allowedMentions: {
        parse: [],
        repliedUser: false
    },
    partials: ["CHANNEL", "MESSAGE", "REACTION"],
    intents: [
        Intents.FLAGS.GUILDS,
        // Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_VOICE_STATES,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    ],
    presence: {
        activities: [{
            name: "bot",
            type: "CUSTOM"
        }],
        status: 'online'
    }
})

// Initiate the Manager with some options and listen to some events.
app.manager = new Manager({
    nodes: config.clientsettings.nodes,
    plugins: [
        new Spotify({
            clientID: config.spotify.clientId, //get a clientid from there: https://developer.spotify.com/dashboard
            clientSecret: config.spotify.secret
        })
    ],
    send(id, payload) {
        const guild = app.guilds.cache.get(id);
        if (guild) guild.shard.send(payload);
    },
})
    .on("nodeConnect", node => console.log(`Node ${node.options.identifier} connected`))
    .on("nodeError", (node, error) => console.log(`Node ${node.options.identifier} had an error: ${error.message}`))
    .on("trackStart", (player, track) => {
        app.channels.cache
            .get(player.textChannel)
            .send(`Now playing: ${track.title}`);
    })
    .on("queueEnd", (player) => {
        app.channels.cache
            .get(player.textChannel)
            .send("Queue has ended.");

        player.destroy();
    });

// Ready event fires when the Discord.JS client is ready.
// Use EventEmitter#once() so it only fires once.
app.once("ready", () => {
    console.log("I am ready!");
    // Initiate the manager.
    app.manager.init(app.user.id);
});

// Here we send voice data to lavalink whenever the bot joins a voice channel to play audio in the channel.
app.on("raw", (d) => app.manager.updateVoiceState(d));

app.on('messageCreate', async message => {
    const { prefix } = config
    if (!message.guild || message.author.bot) return
    if (!message.content.startsWith(prefix)) return
    let args = message.content.slice(prefix.length).trim().split(/ +/)
    let cmd = args.shift()?.toLowerCase()

    if (cmd && cmd.length > 0) {
        switch (cmd) {
            case "ping":
                message.reply('Pinging the API...').then(msg => {
                    msg.edit({ content: `> **API PING** \`${app.ws.ping}\`\n\n> **BOT PING:** \`${(Date.now() - msg.createdTimestamp) - (2 * app.ws.ping)}\`` })
                }).catch(console.error)
                break;
            case "help":
                const embed = new MessageEmbed()
                    .setColor("BLURPLE")
                    .setTitle("Embed")
                    .setDescription(`Hello I am ${app.user.username} and I am a cool bot!\n\n**These are my Commands:**`)
                    .setThumbnail(app.user.displayAvatarURL())
                    .setFooter(message.guild.name, message.guild.iconURL({ dynamic: true }))
                    .addFields([
                        { name: "**ping**", value: `> *Shows the Ping of me*`, inline: true },
                        { name: "**help**", value: `> *Gives you help*`, inline: true },
                    ])

                message.reply({
                    embeds: [embed]
                })
                break
            case "play":
                if (!args[0]) {
                    message.reply('**!play** *needs a query!*\n\nExample:\n!play mc poze nos anos 80')
                    return
                }
                const res = await app.manager.search(
                    message.content.slice(6),
                    message.author
                );

                // Create a new player. This will return the player if it already exists.
                const player = app.manager.create({
                    guild: message.guild.id,
                    voiceChannel: message.member.voice.channel.id,
                    textChannel: message.channel.id,
                });

                // Connect to the voice channel.
                if (player.state === 'DISCONNECTED')
                    player.connect();

                // Adds the first track to the queue.
                player.queue.add(res.tracks[0]);
                message.channel.send(`Enqueuing track ${res.tracks[0].title}.`);

                // Plays the player (plays the first track in the queue).
                // The if statement is needed else it will play the current track again
                if (!player.playing && !player.paused && !player.queue.size)
                    player.play();

                // For playlists you'll have to use slightly different if statement
                if (
                    !player.playing &&
                    !player.paused &&
                    player.queue.totalSize === res.tracks.length
                )
                    player.play();
                break
            case "queue":
                {
                    // Create a new player. This will return the player if it already exists.
                    const player = app.manager.create({
                        guild: message.guild.id,
                        voiceChannel: message.member.voice.channel.id,
                        textChannel: message.channel.id,
                    });

                    fields = player.queue.map((item, index) => {
                        return { name: `**${index+1}.**`, value: `> *${item.title}*` }
                    })

                    const embed = new MessageEmbed()
                        .setColor("BLURPLE")
                        .setTitle("Music queue")
                        .setThumbnail(app.user.displayAvatarURL())
                        .setFooter(message.guild.name, message.guild.iconURL({ dynamic: true }))
                        .addFields([
                            { name: `**Current playing:**`, value: `> *${player.queue.current.title}*\n >>${player.queue.current.displayThumbnail()}` },
                            ...fields
                        ])

                    message.reply({
                        embeds: [embed]
                    })
                }
                break
            default:
                {
                    message.reply('**Unknown command**')
                }
                break;
        }
    }
});

// app.on('interactionCreate', async interaction => {
//     if (!interaction.isCommand()) return;
//     console.log(app);

// 	const { commandName, member, guildId, applicationId,
//         deferred, channelId, createdTimestamp } = interaction;
//     const { guild } = member
//     let channel = guild.channels.cache.get(channelId)

//     interaction.reply({content: 'Pinging the API...', ephemeral: true}).then(inter => {
//         // inter.editReply({content: `> **API PING** \`${app.ws.ping}\`\n\n> **BOT PING:** \`${(Date.now() - createdTimestamp) - (2 * app.ws.ping)}\``, ephemeral: true})
//     }).catch(console.error)

// 	switch (commandName) {
//         case 'join':
//             interaction.member.voiceChannel.join()
//     }
// });

app.login(config.token)