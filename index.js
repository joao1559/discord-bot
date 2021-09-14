// Require the necessary discord.js classes
const { Client, Intents } = require('discord.js');
const ytdl = require('ytdl-core')
const { token } = require('./config.json')

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
        // Intents.FLAGS.GUILD_VOICE_STATES,
        Intents.FLAGS.GUILD_MESSAGES,
        // Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    ],
    presence: {
        activities: [{
            name: "bot",
            type: "WATCHING"
        }],
        status: 'dnd'
    }
})

app.once('ready', () => {
    console.log('connected');
})

app.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    console.log(app);

	// const { commandName } = interaction;

	// switch (commandName) {
    //     case 'join':
    //         interaction.member.voiceChannel.join()
    // }
});

app.login(token)