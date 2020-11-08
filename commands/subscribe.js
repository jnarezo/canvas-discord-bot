const winston = require('winston');
const schedule = require('node-schedule');
const Discord = require('discord.js');

const canvas = require('../util/canvas.js');
const scheduler = require('../util/scheduler.js');

module.exports = {
  name: 'subscribe',
  description: 'Sends notifications when new assignments with due dates are released in the given course.',
  aliases: ['sub', 'follow'],
  usage: '<courseID>',
  execute(message, args) {
    subscribe(message, args);
  },
};

function subscribe(msg, args) {
  if (!args || args.length < 1) {
    msg.channel.send("Please specify the course's ID.");
    return;
  }

  const courseName = args.join(' ').toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  canvas.fetchCourses().then((courses) => {
    if (!courses) throw new Error('No courses.');

    const matchCourses = courses.filter(c => !!c.name.toLowerCase().match(new RegExp(courseName, 'g')));

    if (matchCourses.length === 0) {
      msg.channel.send('No matches. Please check your search criteria.');
      return;
    } else if (matchCourses.length > 1) {
      // throw back multiple matches
      msg.channel.send('Multiple matches. (TODO: send embed of matches)');
      return;
    }

    const matchCourse = matchCourses[0];
    scheduler.scheduleSubscribe(msg.guild.id, msg.channel.id, matchCourse, null);
    msg.react('✅');
  }).catch((e) => {
    msg.channel.send('⚠️ Unable to fetch your courses from Canvas.');
    winston.warn('Unable to fetch courses from subscribe: ', e);
  });
}