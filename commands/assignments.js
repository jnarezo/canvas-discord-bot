const winston = require('winston');
const Discord = require('discord.js');

const canvas = require('../util/canvas.js');

module.exports = {
  name: 'assignments',
  description: 'Displays upcoming assignments in the specified course.',
  aliases: ['assigns', 'hw'],
  usage: '<courseID>',
  execute(message, args) {
    showAssignments(message, args);
  },
};

function showAssignments(msg, args) {
  if (!args || args.length < 1) {
    msg.channel.send('Please specify a course by name.');
    return;
  }

  const courseName = args.join(' ').toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  canvas.fetchCourses().then((courses) => {
    if (!courses) throw 'No courses.';

    const matchCourses = courses.filter(c => !!c.name.toLowerCase().match(new RegExp(courseName, 'g')));
    if (matchCourses.length === 0) {
      msg.channel.send('No matching course. Please check your search criteria.');
      return;
    } else if (matchCourses.length > 1) {
      // throw back multiple matches
      msg.channel.send('Multiple matches. (TODO: send embed of matches)');
      return;
    }

    canvas.fetchAssignments(matchCourses[0].id).then((assignments) => {
      if (!assignments || assignments.length === 0) {
        msg.channel.send('Looks like this class has no upcoming assignments at the moment. Woo-hoo! 🎉');
        return;
      }

      const embed = new Discord.MessageEmbed()
        .setColor('#D3371E')
        .setTitle('Upcoming Assignments')
        .setDescription('These are all the assignments in your course with an upcoming due date:')
        .setFooter('Get reminders when an assignment is due with -remind');

      for (const a of assignments) {
        embed.addField(a.name, `Due at: ${new Date(a.due_at)}`);
      }
      msg.channel.send(embed);
    }).catch((e) => {
      msg.channel.send('⚠️ An error occurred while finding course assignments. Perhaps changes your search criteria?');
      winston.http('Fetch course assignments failed: ', e);
    });
  }).catch((e) => {
    msg.channel.send('⚠️ An error occurred while finding your courses. Please check your search criteria or active classes.');
    winston.http('Fetch course failed: ', e);
  });
}