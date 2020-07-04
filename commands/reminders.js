const winston = require('winston');
const Discord = require('discord.js');

const database = require('../util/database.js');

module.exports = {
  name: 'reminders',
  description: 'Lists all active courses that allow you to track its assignments.',
  aliases: ['rems', 'showrems', 'showreminders'],
  execute(message, args) {
    showReminders(message);
  },
};

function showReminders(msg) {
  database.fetchGuildReminders(msg.guild.id).then((reminders) => {
    if (reminders.length <= 0) {
      msg.channel.send("Looks like you do not have any active reminders.");
      return;
    }

    const embed = new Discord.MessageEmbed()
        .setColor('#B8261C')
        .setTitle('Server Reminders')
        .setDescription("These are your server's active assignment reminders:")
    for (let i = 0; i < reminders.length; ++i){
      embed.addField(`${reminders[i].info.course_name || ''}`, `**${i+1}.** ${reminders[i].info.assignment_name}`);
    }
    msg.channel.send(embed);
  }).catch((e) => {
    msg.channel.send('It looks like an error occurred when retrieving your reminders.');
    winston.http('Fetch guild reminders failed: ', e);
  });
}