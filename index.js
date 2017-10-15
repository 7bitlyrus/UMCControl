const discord   = require('discord.js');
const client    = new discord.Client();
const rpn       = require('request-promise-native');
const crypto    = require('crypto');
const Gamedig   = require('gamedig');

var config = require("./config.json");

var commands = {
	"state":  {
		"func": (msg) => {
			Gamedig.query({
				type: 'minecraftping',
				host: config.server.ip,
				port: config.server.port || 25565
			}).then((r) => {
				msg.reply("The server appears to be online.")
			}).catch((e) => {
				msg.reply("The server appears to be offline.")
			});
		}
	},
	"list":  {
		"func": (msg) => {
			Gamedig.query({
				type: 'minecraftping',
				host: config.server.ip,
				port: config.server.port || 25565
			}).then((r) => {
				plys = []
				r.players.forEach((ply) => {
					plys.push(ply.name);
				});
				msg.reply(`The following users are on the server:\n\`\`\`${plys.join(", ")}\`\`\``);
			}).catch((e) => {
				msg.reply("The server appears to be offline.");
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
			var url  = `${config.panel.endpoint}/user/server/${config.server.uuid}/command`
			var cmd  = args.join(" ")
			var body = {"command": cmd}

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

			rpn(opts)
			.then(() => {
				msg.reply(":ok_hand:")
			}).catch((e) => {
				console.warn(e)
				msg.reply(":warning: An error occurred. The server may be offline or refusing our request.");
			})
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
		msg.reply(":x: Access denied. ")
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
	var url = `${config.panel.endpoint}/user/server/${config.server.uuid}/power`
	var body = {"action": action}

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

	rpn(opts)
	.then(() => {
		msg.reply(":ok_hand:")
	}).catch(() => msg.reply(":warning: An error occurred. The server may be in the process of completing another " +
		"power action or already be in that state.")
	)
}