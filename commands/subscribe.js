const winston = require('winston');
const schedule = require('node-schedule');
const Discord = require('discord.js');

const canvas = require('../util/canvas.js');
const database = require('../util/database.js');
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

// Every day at 6AM, send course updates
const rule = new schedule.RecurrenceRule();
rule.hour = 6;
rule.minute = 0;

function subscribe(msg, args) {
  if (!args || args.length < 1) {
    msg.channel.send("Please specify the course's ID.");
    return;
  }

  const courseName = args.join(' ').toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  canvas.fetchCourses().then((courses) => {
    if (!courses) throw 'No courses.';

    const matchCourses = courses.filter(c => !!c.name.toLowerCase().match(new RegExp(courseName, 'g')));

    if (!matchCourses) {
      msg.channel.send('No matches. Please check your search criteria.');
      return;
    } else if (matchCourses.length > 1) {
      // throw back multiple matches
      msg.channel.send('Multiple matches. (TODO: send embed of matches)');
      return;
    }

    if (scheduler.scheduleSubscribe(msg.guild.id, msg.channel.id, course, null)) {
      msg.react('✅');
    }
  }).catch((e) => {
    msg.channel.send('⚠️ Unable to fetch your courses from Canvas.');
    winston.warn('Unable to fetch courses from subscribe: ', e);
  });
}

function trackCourse(channel, courseID) {
  // Schedule new subscription.
  const job = schedule.scheduleJob(rule, () => {
    if (!channel.guild.available || !channel.viewable) {
      job.cancel();
      database.removeSubscribe(channel.guild.id, courseID);
      return;
    }

    // Check for new assignments.
    canvas.fetchAssignments(courseID).then((upcoming) => {
      if (!upcoming) return;

      const upcomingIDs = [];
      for (const assign of upcoming) {
        upcomingIDs.push(assign.id);
      }

      if (upcoming.length > 0) {
        database.fetchSubscribe(channel.guild.id).then((oldAssigns, roles) => {
          if (!oldAssigns) return;

          const newAssigns = upcoming.filter(id => !oldAssigns.includes(id));
          let mentions = '';
          if (roles) {
            for (const role of roles) {
              mentions += role;
            }
          }

          // Notify if there are new assignments in the guild's tracked courses.
          if (newAssigns.length > 0) {
            const embed = new Discord.MessageEmbed()
                .setColor('#0099FF')
                .setTitle('Subscription Update')
                .setDescription(`You have new assignments for your tracked courses:`)
                .setTimestamp()
                .setFooter('Get reminders when an assignment is due with \`remind\`!');

            for (const a of newAssigns) {
              embed.addField(`ID: ${a.id} | Last updated: ${a.updated_at}`, a.name);
            }
            channel.send(mentions, embed);
          } else {
            channel.send(mentions + 'No new assignments today!');
          }
        }).catch((e) => {
          winston.warn('Failed to fetch old assignments from the database: ', e);
        });
      }

      database.storeSubscribe(channel, courseID, upcomingIDs).catch((e) => {
        winston.warn('Could not store a course subscription in the database: ', e);
      });
    }).catch((e) => {
      winston.http('Could not fetch course assignments (subscribe): ', e);
    });
  });
  return job;
}

function saveSubscription(channel, courseID) {
  canvas.fetchAssignments(courseID).then((upcoming) => {
    const upcomingIDs = [];
    for (const assign of upcoming) {
      upcomingIDs.push(assign.id);
    }
    database.storeSubscribe(channel, courseID, upcomingIDs).catch((e) => {
      winston.warn('Could not store a course subscription in the database: ', e);
    });
  }).catch((e) => {
    winston.http('Could not fetch course assignments (subscribe): ', e);
  });
}