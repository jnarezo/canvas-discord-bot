const fs = require('fs');
const Discord = require('discord.js');

module.exports = {
  name: 'help',
  description: 'Gives the list of available commands.',
  aliases: ['commands'],
  execute(message, args) {
    showHelp(message, args);
  },
};

const commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`./${file}`);
  commands.set(command.name.split(' '), command);   // FIXME: why did I split(' ')?
}

function showHelp(msg, args) {
  const embed = new Discord.MessageEmbed()
    .setColor('#D3371E')
    .setTitle('Commands')
    .setDescription('Here\'s a list of my available commands:');

  for (const [name, cmd] of commands) {
    const title = `${name} ${cmd.usage || ''}`;
    embed.addField(title, cmd.description);
  }
  msg.channel.send(embed);
}