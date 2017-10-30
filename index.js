const discord   = require('discord.js');
const client    = new discord.Client();
const rpn       = require('request-promise-native');
const crypto    = require('crypto');
const Gamedig   = require('gamedig');

let config = require("./config.json");

let commands = {
	state: {
		"func": (msg) => query(msg, () => msg.reply(":white_check_mark: The server appears to be online."))
	},
	list: {
		"func": (msg) => {
			query(msg, (r) => {
				const plys = r.players.map(ply => ply.name);
				if(plys.length) msg.reply(`:scroll: The following users are online:\n\`\`\`${plys.join(", ")}\`\`\``);
				else msg.reply(":no_pedestrians: No users are on the server.")
			});
		}
	},
	start: powerCmd("start"),
	stop: powerCmd("stop"),
	restart: powerCmd("restart"),
	kill: powerCmd("kill"),
	sendcommand: {
		privileged: true,
		func: (msg, args) => {
			callServerAPI("command", {"command": args.join(" ")}, msg, ":warning: An error occurred. The server may " +
				"be offline or refusing our request.")
		}
	}
}

client.on('message', (msg) => {
	if(msg.author.id == client.user.id) return;
	if(!msg.content.startsWith(config.discord.prefix)) return;

	const args = msg.content.split(" ");
	const cmd = args.shift().slice(config.discord.prefix.length);

	if(!commands[cmd]) return;

	if(commands[cmd].privileged && !msg.member.roles.get(config.discord.privRole)) {
		msg.reply(":no_entry_sign: You do not have the role required to run this command.")
		return;
	}

	commands[cmd].func(msg, args)
});

client.on('ready', () => console.log("Ready."));
client.on('error', console.error);
client.on('warn', console.warn);
client.on('disconnect', console.warn);

client.login(config.discord.token);

function powerCmd(action) {
	return {
		privileged: true,
		func: (msg) => callServerAPI("power", {"action": action}, msg, ":warning: An error occurred. The server " + 
			"may be in the process of completing another power action or already be in that state.")
	}
}

function callServerAPI(endpoint, body, msg, errmsg) {
	let url = `${config.panel.endpoint}/user/server/${config.server.uuid}/${endpoint}`

	hmac = crypto.createHmac("sha256", config.panel.private);
	hmac.update(`${url}${JSON.stringify(body)}`);

	let opts = {
		method: 'POST',
		uri: url,
		headers: {
			'Authorization': `Bearer ${config.panel.public}.${hmac.digest("base64")}`
		},
		body: body,
		json: true
	};

	rpn(opts).then(() => msg.reply(":ok_hand:")).catch(() => msg.reply(errmsg))
} 

function query(msg, cb) {
	Gamedig.query({
		type: 'minecraftping',
		host: config.server.ip,
		port: config.server.port || 25565
	}).then(cb).catch(() => msg.reply(":x: The server appears to be offline."));
}
