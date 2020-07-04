const winston = require('winston');
const Discord = require('discord.js');

const canvas = require('../util/canvas.js');

module.exports = {
  name: 'courses',
  description: 'Lists all active courses that allow you to track its assignments.',
  execute(message, args) {
    showCourses(message);
  },
};

function showCourses(msg) {
  canvas.fetchCourses().then((courses) => {
    if (courses.length <= 0) {
      msg.channel.send("Looks like you're not in any active courses at the moment.");
      return;
    }

    const embed = new Discord.MessageEmbed()
        .setColor('#B8261C')
        .setTitle('Active Courses')
        .setFooter('Track a course by specifying its course ID or name!');
    
    let desc = 'These are your active courses whose assignments you can track:\n';
    for (const c of courses) {
      // embed.addField(c.name, '\u200b');
      desc += (`\n**${c.name}**\n`);
    }
    embed.setDescription(desc);
    msg.channel.send(embed);
  }).catch((e) => {
    msg.channel.send('It looks like an error occurred when retrieving your courses.');
    winston.http('Fetch courses failed: ', e);
  });
}