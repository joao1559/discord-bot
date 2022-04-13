require('dotenv').config()
const { Client, Intents, MessageEmbed } = require('discord.js')
const { Manager } = require('erela.js')
const Spotify = require('erela.js-spotify')
const config = JSON.parse(process.env.CONFIG_JSON)

const app = new Client({
	restTimeOffset: 0,
	allowedMentions: {
		parse: [],
		repliedUser: false
	},
	partials: ['CHANNEL', 'MESSAGE', 'REACTION'],
	intents: [
		Intents.FLAGS.GUILDS,
		// Intents.FLAGS.GUILD_MEMBERS,
		Intents.FLAGS.GUILD_VOICE_STATES,
		Intents.FLAGS.GUILD_MESSAGES,
		Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
	],
	presence: {
		activities: [{
			name: 'bot',
			type: 'CUSTOM'
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
		const guild = app.guilds.cache.get(id)
		if (guild) guild.shard.send(payload)
	},
})
	.on('nodeConnect', node => console.log(`Node ${node.options.identifier} connected`))
	.on('nodeError', (node, error) => console.log(`Node ${node.options.identifier} had an error: ${error.message}`))
	.on('queueEnd', (player) => {
		app.channels.cache
			.get(player.textChannel)
			.send('Queue has ended.')

		player.destroy()
	})

// Ready event fires when the Discord.JS client is ready.
// Use EventEmitter#once() so it only fires once.
app.once('ready', () => {
	console.log('I am ready!')
	// Initiate the manager.
	app.manager.init(app.user.id)
})

// Here we send voice data to lavalink whenever the bot joins a voice channel to play audio in the channel.
app.on('raw', (d) => app.manager.updateVoiceState(d))

app.on('messageCreate', async message => {
	const { prefix } = config
	if (!message.guild || message.author.bot) return
	if (!message.content.startsWith(prefix)) return
	let args = message.content.slice(prefix.length).trim().split(/ +/)
	let cmd = args.shift()?.toLowerCase()

	// Create a new player. This will return the player if it already exists.
	const player = app.manager.create({
		guild: message.guild.id,
		voiceChannel: message.member.voice.channel.id,
		textChannel: message.channel.id,
		selfDeafen: true
	})

	const cases = {
		'ping': () => {
			message.reply('Pinging the API...').then(msg => {
				msg.edit({ content: `> **API PING** \`${app.ws.ping}\`\n\n> **BOT PING:** \`${(Date.now() - msg.createdTimestamp) - (2 * app.ws.ping)}\`` })
			}).catch(console.error)
		},
		'help': () => {
			const embed = new MessageEmbed()
				.setColor('BLURPLE')
				.setTitle('Embed')
				.setDescription(`Hello I am ${app.user.username} and I am a cool bot!\n\n**These are my Commands:**`)
				.setThumbnail(app.user.displayAvatarURL())
				.setFooter(message.guild.name, message.guild.iconURL({ dynamic: true }))
				.addFields([
					{ name: '**ping**', value: '> *Shows the Ping of me*', inline: true },
					{ name: '**help**', value: '> *Gives you help*', inline: true },
					{ name: '**play**', value: '> *Start to play the song directly*', inline: true },
					{ name: '**search**', value: '> *Start to play the song, after choose it*', inline: true },
					{ name: '**queue**', value: '> *Show the song queue*', inline: true },
					{ name: '**q**', value: '> *Alias for queue*', inline: true },
					{ name: '**pause**', value: '> *Pause the song*', inline: true },
					{ name: '**p**', value: '> *Alias for pause*', inline: true },
					{ name: '**resume**', value: '> *Resume the song*', inline: true },
					{ name: '**r**', value: '> *Alias for resume*', inline: true },
					{ name: '**skip**', value: '> *Skip the song*', inline: true },
					{ name: '**s**', value: '> *Alias for skip*', inline: true },
					{ name: '**disconnet**', value: '> *Disconnect the DJ*', inline: true },
					{ name: '**quit**', value: '> *Alias for diconnect*', inline: true },
					{ name: '**Shuffle**', value: '> *Shuffle the queue*', inline: true },
					{ name: '**mix**', value: '> *Alias for shuffle*', inline: true },
					{ name: '**clear**', value: '> *Clears the queue*', inline: true },
				])

			message.reply({
				embeds: [embed]
			})
		},
		'play': async () => {
			if (!args[0]) {
				message.reply(':warning: **!play** *needs a query!*\n\nExample:\n!play mc poze nos anos 80')
				return
			}
			const res = await app.manager.search(
				message.content.slice(6),
				message.author
			)

			// Connect to the voice channel.
			if (player.state === 'DISCONNECTED')
				player.connect()

			if (res.loadType === 'PLAYLIST_LOADED') {
				res.tracks.forEach(track => {
					player.queue.add(track)
				})

				message.channel.send(`Enqueuing ${res.tracks.length} tracks from ${res.playlist.name}.`)
			}
			else {
				player.queue.add(res.tracks[0])
				message.channel.send(`Enqueuing track ${res.tracks[0].title}.`)
			}


			// Plays the player (plays the first track in the queue).
			// The if statement is needed else it will play the current track again
			if (!player.playing && !player.paused && !player.queue.size)
				player.play()

			// For playlists you'll have to use slightly different if statement
			if (
				!player.playing &&
                !player.paused &&
                player.queue.totalSize === res.tracks.length
			)
				player.play()
		},
		'queue': () => {
			let fields = player.queue.map((item, index) => {
				return { name: `**${index+1}.**`, value: `> *${item.title} (${item.author})*` }
			})

			const embed = new MessageEmbed()
				.setColor('BLURPLE')
				.setTitle('Music queue')
				.setThumbnail(app.user.displayAvatarURL())
				.setFooter(message.guild.name, message.guild.iconURL({ dynamic: true }))
				.addFields([
					{ name: '**Current playing:**', value: `> *${player.queue.current.title} (${player.queue.current.author})*` },
					...fields
				])

			message.reply({
				embeds: [embed]
			})
		},
		'q': () => {
			let fields = player.queue.map((item, index) => {
				return { name: `**${index+1}.**`, value: `> *${item.title} (${item.author})*` }
			})

			const embed = new MessageEmbed()
				.setColor('BLURPLE')
				.setTitle('Music queue')
				.setThumbnail(app.user.displayAvatarURL())
				.setFooter(message.guild.name, message.guild.iconURL({ dynamic: true }))
				.addFields([
					{ name: '**Current playing:**', value: `> *${player.queue.current.title} (${player.queue.current.author})*` },
					...fields
				])

			message.reply({
				embeds: [embed]
			})
		},
		'search': async () => {
			if (!args || !args.length) {
				message.reply(':warning: *Command **!search** needs a query*\nExample:\n *!search shake it bololo*')
				return
			}

			let search = args.join(' ')
			const res = await app.manager.search(
				search,
				message.author,
			)

			let fields = res.tracks.map((item, index) => {
				if (index > 9) return
				return { name: `**${index+1}.**`, value: `> *${item.title} (${item.author})*` }
			}).filter(item => item)

			const embed = new MessageEmbed()
				.setColor('BLURPLE')
				.setTitle('Music queue')
				.setThumbnail(app.user.displayAvatarURL())
				.setFooter(message.guild.name, message.guild.iconURL({ dynamic: true }))
				.addFields(fields)

			message.reply({
				embeds: [embed]
			})

			const filter = m => m.author.id === message.author.id && message.content?.length
			const collector = message.channel.createMessageCollector({filter, max: 1})

			collector.once('end', (collected, reason) => {
				if (reason === 'limit') {
					let selected = res.tracks[collected.first().content - 1]
					player.queue.add(selected)
					message.channel.send(`Enqueuing track ${selected.title}.`)

					if (player.state === 'DISCONNECTED')
						player.connect()

					if (!player.playing && !player.paused && !player.queue.size)
						player.play()
				}
			})
		},
		'pause': () => {
			message.reply(`**${player.playing ? 'Paused' : 'Resumed'}!**`)
			player.pause(player.playing)
		},
		'p': () => {
			message.reply(`**${player.playing ? 'Paused' : 'Resumed'}!**`)
			player.pause(player.playing)
		},
		'resume': () => {
			message.reply(`**${player.playing ? 'Paused' : 'Resumed'}!**`)
			player.pause(player.playing)
		},
		'r': () => {
			message.reply(`**${player.playing ? 'Paused' : 'Resumed'}!**`)
			player.pause(player.playing)
		},
		'skip': () => {
			message.reply('**Skipped!**')
			player.stop()
		},
		's': () => {
			message.reply('**Skipped!**')
			player.stop()
		},
		'disconnect': () => {
			if (player.state === 'CONNECTED')
				player.destroy()
		},
		'quit': () => {
			if (player.state === 'CONNECTED')
				player.destroy()
		},
		'mix': () => {
			player.queue.shuffle()
			message.reply('**Queue shuffled**')
		},
		'shuffle': () => {
			player.queue.shuffle()
			message.reply('**Queue shuffled**')
		},
		'clear': () => {
			player.queue.clear()
			player.stop()
			message.reply(':wastebasket: The queue is now empty')
		},
		'loop': () => {
			player.setQueueRepeat(!player.queueRepeat)
			message.reply(':repeat: The queue is now on repeat mode')
		}
	}

	if (cases[cmd]) cases[cmd]()
	else {
		message.reply(':x: **Unknown command**')
	}
})

app.login(config.token)