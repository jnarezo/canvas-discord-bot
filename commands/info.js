const Discord = require('discord.js');

module.exports = {
  name: 'info',
  description: 'Displays some information about me!',
  aliases: ['about'],
  execute(message, args) {
    showInfo(message, args);
  },
};

function showInfo(msg, args) {
  const embed = new Discord.MessageEmbed()
      .setColor('#D3371E')
      .setTitle('Atelier Open-Source')
      .setDescription('A bot designed to help educational Discord communities stay ahead of the game.')
      // TDOO: .setThumbnail('')

  msg.channel.send(embed);
}