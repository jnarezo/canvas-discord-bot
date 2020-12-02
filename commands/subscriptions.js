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
  database.fetchGuildSubs(msg.guild.id).then((subs) => {
    if (!subs || subs <= 0) {
      msg.channel.send("Looks like you do not have any active subscriptions.");
      return;
    }
    
    const embed = new Discord.MessageEmbed()
        .setColor('#D3371E')
        .setTitle('Server Subscriptions')
        .setDescription("These are your server's active course subscriptions:")
    for (const s of subs) {
      embed.addField(`ID: ${s.info.course_id}`, `**${s.info.course_name || 'todo'}**`);
    }
    msg.channel.send(embed);
  }).catch((e) => {
    msg.channel.send('It looks like an error occurred when retrieving your subscriptions.');
    winston.http('Fetch guild subs failed: ', e);
  });
}