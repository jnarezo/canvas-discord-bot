const fs = require('fs');
const winston = require('winston');
const Discord = require('discord.js');

const logger = require('./util/logger.js');
const scheduler = require('./util/scheduler.js');

const { prefix, discordToken, adminID } = require('./config.json');

const client = new Discord.Client();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
client.commands = new Discord.Collection();
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.name, command);
}

// ---------------------------------------------------------------

client.on('ready', () => {
  scheduler.init(client);
  winston.info('Restoring reminders and subscriptions..');
  scheduler.restore();  
  winston.info('Ready.');
});

client.on('message', (msg) => {
  if ((msg.author.id != adminID) || !msg.content.startsWith(prefix) || msg.author.bot) return;

  // Separate command call and arguments
  const args = msg.content.slice(prefix.length).split(/ +/);
  const commandCall = args.shift().toLowerCase();

  const command = client.commands.get(commandCall)
      || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandCall));
  if (!command) return;

  try {
    command.execute(msg, args);
  } catch (e) {
    winston.warn(`${command.name} execute() failed. `, e);
  }
});

client.on('guildCreate', (guild) => {
  winston.info('Joined guild. Creating guild data..');
});

client.on('guildDelete', (guild) => {
  winston.info('Left guild. Deleting guild data..');
  scheduler.cancelGuildJobs(guild.id);
});

// Start the bot
client.login(discordToken).catch((e) => {
  winston.error('Login failed. Is the DISCORD_TOKEN env. variable set? ', e);
});