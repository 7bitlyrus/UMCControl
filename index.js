const discord   = require('discord.js');
const client    = new discord.Client();
const rpn       = require('request-promise-native');
const crypto    = require('crypto');
const Gamedig   = require('gamedig');

var config = require("./config.json");

var commands = {
	"state":  {
		"func": (msg) => {
			query(msg, () => msg.reply("The server appears to be online."));
		}
	},
	"list":  {
		"func": (msg) => {
			query(msg, (r) => {
				plys = []
				r.players.forEach((ply) => plys.push(ply.name));
				msg.reply(`The following users are on the server:\n\`\`\`${plys.join(", ")}\`\`\``);
			});
		}
	},
	"start": {
		"privileged": true,
		"func": (msg) => power("start", msg)
	},
	"stop": {
		"privileged": true,
		"func": (msg) => power("stop", msg)
	},
	"restart": {
		"privileged": true,
		"func": (msg) => power("restart", msg)
	},
	"kill": {
		"privileged": true,
		"func": (msg) => power("kill", msg)
	},
	"sendcommand": {
		"privileged": true,
		"func": (msg, args) => {
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

	isPleb = msg.member.roles.get(config.discord.privRole) ? false : true
	if(commands[cmd].privileged && isPleb) {
		msg.reply(":x: Access denied.")
		return;
	}

	commands[cmd].func(msg, args)
});

client.on('ready', () => console.log("Ready."));
client.on('error', console.error);
client.on('warn', console.warn);
client.on('disconnect', console.warn);

client.login(config.discord.token);

function power(action, msg) {
	callServerAPI("power", {"action": action}, msg, ":warning: An error occurred. The server may be in the process of " + 
		"completing another power action or already be in that state.")
}

function callServerAPI(endpoint, body, msg, errmsg) {
	var url = `${config.panel.endpoint}/user/server/${config.server.uuid}/${endpoint}`

	hmac = crypto.createHmac("sha256", config.panel.private);
	hmac.update(`${url}${JSON.stringify(body)}`);

	var opts = {
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
	}).then(cb).catch(() => msg.reply("The server appears to be offline."));
}