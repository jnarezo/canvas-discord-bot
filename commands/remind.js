const schedule = require('node-schedule');
const winston = require('winston');

const canvas = require('../util/canvas.js');
const scheduler = require('../util/scheduler.js');

module.exports = {
  name: 'remind',
  description: `Sends a reminder when an assignment for a course is due to any target channels or the current, and to any mentioned roles.
    By default, a reminder will be sent 12, 6, and 2 hours before the due-date.
    For example: remind #reminders 2d3h 10h biology "my assignment" "Please complete asap!"`,
  aliases: ['reminder', 'remindme', 'setremind', 'setreminder'],
  usage: '[roles] [channels] <times [w|d|h]> <course name> <assignment name> [note]',
  execute(message, args) {
    setReminder(message, args);
  },
};

function setReminder(msg, args) {
  if (!args || args.length < 3) {
    msg.channel.send("Please specify the course's ID and assignment's ID. A reminder note is optional.");
    return;
  }

  // Parse mentions and channels at the front of the message.
  const mentions = new Set();
  const channels = new Set();
  while (args.length != 0 && !!args[0].match(/<(#|@|@&)[0-9]*>/)) {
    const arg = args.shift();
    if (arg.charAt(1) === '#') {
      channels.add(arg);
    } else {
      mentions.add(arg);
    }
  }
  if (channels.size === 0) channels.add(`<#${msg.channel.id}>`);

  // Parse reminder times.
  const times = [];
  while (args.length !== 0 && args[0].match(/[0-9]+[w|d|h]/)) {
    const time = {
      weeks: 0,
      days: 0,
      hours: 0,
    };
    const units = args.shift().match(/[0-9]+[w|d|h]/);
    for (const u of units) {
      switch (u.slice(-1)) {
        case 'w':
          time.months = parseInt(u.slice(0, u.length-1));
          break;
        case 'd':
          time.days = parseInt(u.slice(0, u.length-1));
          break;
        case 'h':
          time.hours = parseInt(u.slice(0, u.length-1));
          break;
        default:
          return;
      }
    }
    times.push(time);
  }

  // Use course/assignment name separated by spaces or grouped by double-quotes.
  let blurbs = [];
  while (args.length && (blurbs.length < 3)) {
    let blurb = args.shift();
    if (blurb.startsWith('"')) {
      while(args[0] && !blurb.endsWith('"')) {
       blurb += ` ${args.shift()}`;
      }
    }
    blurbs.push(blurb);
  }
  
  if (blurbs.length < 2) {
    // user must enter more arguments
    return;
  }

  blurbs = blurbs.map(blurb => blurb.toLowerCase().replace(/[^\s\w]/g, ''));
  const courseName = blurbs.shift();
  const assignName = blurbs.shift();
  const memo = blurbs.shift();

  canvas.fetchCourses().then((courses) => {
    const matchCourses = courses.filter(c => !!c.name.toLowerCase().match(new RegExp(courseName, 'g')));

    if (matchCourses.length === 0) {
      msg.channel.send('No matching course. Please check your search criteria.');
      return;
    } else if (matchCourses.length > 1) {
      msg.channel.send('Multiple course matches. (TODO: send embed of matches)');
      return;
    }

    const matchCourse = matchCourses[0];
    canvas.fetchAssignments(matchCourse.id).then((assigns) => {
      const matchAssigns = assigns.filter(a => !!a.name.toLowerCase().match(new RegExp(assignName, 'g')));

      if (matchAssigns.length === 0) {
        msg.channel.send('No matching assignment. Please check your search criteria.');
        return;
      } else if (matchAssigns.length > 1) {
        msg.channel.send('Multiple assignment matches. (TODO: send embed of matches)');
        return;
      }

      const match = matchAssigns[0];
      if (scheduler.scheduleReminder(msg.guild.id, matchCourse, match, times, Array.from(channels), Array.from(mentions), memo)) {
        msg.react('✅').catch((e) => {
          msg.channel.send(`Set reminder for **${match.name}**, due at **${match.due_at}**.`);
        });
        return;
      }

      msg.channel.send("This assignment's due date is too close or has already passed! 🕒");
    }).catch((e) => {
      msg.channel.send('⚠️ Could not find the specified assignment. Please check your search criteria.');
      winston.http('Fetch assignment failed: ', e);
    });
  }).catch((e) => {
    msg.channel.send('⚠️ Could not find the specified course. Please check your search criteria.');
  });
}