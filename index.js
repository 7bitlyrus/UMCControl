const discord   = require('discord.js')
const client    = new discord.Client()
const rpn       = require('request-promise-native')
const crypto    = require('crypto')
const Gamedig   = require('gamedig')
const config    = require("./config.json")

let strings = { // You should edit your config to change strings instead of here!
	"server_online":  ":white_check_mark: The server appears to be online.",
	"server_offline": ":white_check_mark: The server appears to be offline.",
	"list_user_list": ":scroll: The following users are online:\n```$list$```",
	"list_no_users":  ":no_pedestrians: No users are on the server.",
	"error_command":  ":warning: An error occurred. The server may be offline or refusing our request.",
	"no_permisson":   ":no_entry_sign: You do not have the role required to run this command.",
	"error_power":    ":warning: An error occurred. The server may be busy entering a state or already in that state.",
	"success":        ":ok_hand:"
}
strings = Object.assign(strings, config.strings)

const commands = {
	state: {
		"func": (msg) => query(msg, () => msg.reply(strings.server_online))
	},
	list: {
		"func": (msg) => {
			query(msg, (r) => {
				const plys = r.players.map(ply => ply.name)
				if(plys.length) msg.reply(strings.list_user_list.replace("$list$", plys.join(", ")))
				else msg.reply(strings.list_no_users)
			})
		}
	},
	start: powerCmd("start"),
	stop: powerCmd("stop"),
	restart: powerCmd("restart"),
	kill: powerCmd("kill"),
	sendcommand: {
		privileged: true,
		func: (msg, args) => {
			callServerAPI("command", {"command": args.join(" ")}, msg, strings.error_command)
		}
	}
}

client.on('message', (msg) => {
	if(msg.author.id == client.user.id) return
	if(!msg.content.startsWith(config.discord.prefix)) return

	const args = msg.content.split(" ")
	const cmd = args.shift().slice(config.discord.prefix.length)

	if(!commands[cmd]) return
	if(commands[cmd].privileged && !msg.member.roles.get(config.discord.privRole)) {
		msg.reply(strings.no_permisson)
		return
	}

	commands[cmd].func(msg, args)
})

client.on('ready', () => console.log("Ready."))
client.on('error', console.error)
client.on('warn', console.warn)
client.on('disconnect', console.warn)

client.login(config.discord.token)

function powerCmd(action) {
	return {
		privileged: true,
		func: (msg) => callServerAPI("power", {"action": action}, msg, strings.error_power)
	}
}

function callServerAPI(endpoint, body, msg, errmsg) {
	const url = `${config.panel.endpoint}/user/server/${config.server.uuid}/${endpoint}`

	let hmac = crypto.createHmac("sha256", config.panel.private)
	hmac.update(`${url}${JSON.stringify(body)}`)

	const opts = {
		method: 'POST',
		uri: url,
		headers: {
			'Authorization': `Bearer ${config.panel.public}.${hmac.digest("base64")}`
		},
		body: body,
		json: true
	}

	rpn(opts).then(() => msg.reply(strings.success)).catch(() => msg.reply(errmsg))
} 

function query(msg, cb) {
	Gamedig.query({
		type: 'minecraftping',
		host: config.server.ip,
		port: config.server.port || 25565
	}).then(cb).catch(() => msg.reply(strings.power_offline))
}
