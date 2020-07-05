const winston = require('winston');
const Discord = require('discord.js');

const database = require('../util/database.js');

module.exports = {
  name: 'subscriptions',
  description: 'Lists all active courses that allow you to track its assignments.',
  aliases: ['subs', 'showsubs'],
  execute(message, args) {
    showSubscriptions(message);
  },
};

function showSubscriptions(msg) {
  msg.channel.startTyping();
  database.fetchGuildSubs(msg.guild.id).then((subs) => {
    if (subs.length > 0) {
      const embed = new Discord.MessageEmbed()
          .setColor('#D3371E')
          .setTitle('Server Subscriptions')
          .setDescription("These are your server's active course subscriptions:")
      for (const s of subs) {
        embed.addField(`ID: ${s.course_id}`, `**${s.course_name || 'todo'}**`);
      }
      msg.channel.send(embed);
    } else {
      msg.channel.send("Looks like you do not have any active subscriptions.");
    }
  }).catch((e) => {
    msg.channel.send('It looks like an error occurred when retrieving your subscriptions.');
    winston.http('Fetch guild subs failed: ', e);
  });
}