const schedule = require('node-schedule');
const winston = require('winston');
const Discord = require('discord.js');

const database = require('./database');
const canvas = require('./canvas');

module.exports = {
  init: init,
  restore: restore,
  scheduleReminder: scheduleReminder,
  cancelReminder: cancelReminder,
  scheduleSubscribe: scheduleSubscribe,
  cancelSubscribe: cancelSubscribe,
  cancelGuildJobs: cancelGuildJobs,
}

let client = null;

function init(discordClient) {
  client = discordClient;
}

// TODO: Add restore subscriptions/persistence.
function restore() {
  // Restore reminders.
  database.fetchAllReminders().then((reminders) => {
    if (!reminders) {
      winston.info('No saved reminders to restore.');
      return;
    }

    for (const r of reminders) {
      const dueDate = new Date(r.info.due_at);
      const job = createReminder(r.info.guild_id, r.info.assignment_id);

      // Initialize. Try to schedule reminder at the closest time.
      while (r.info.times.length > 0) {
        const date = beforeDate(dueDate, r.info.times[0]);
        winston.verbose('Restore attempt of reminder at remDate %s, while dueDate at %s.', date, dueDate);
        if (job.schedule(date)) break;
        r.info.times.shift();
      }
      // Unable to schedule due to past times. Delete reminder.
      if (r.info.times.length === 0) database.deleteReminder(r.info.guild_id, r.info.assignment_id);
    }
  }).catch((e) => {
    winston.warn('Unable to restore back-up info: ', e);
  });

  // // Restore subscriptions.
  // database.fetchAllSubscriptions().then((subs) => {
  //   for (const s of subs) {
  //     scheduleReminder(s.channelIDs, s.assignmentName);
  //   }
  // }).catch((e) => {
  //   // unable to fetch any stored reminders
  // });
}

// TODO: Stop duplicate reminders.
function scheduleReminder(guildID, course, assignment, timesBefore, channels, mentions, memo) {
  const dueDate = new Date(assignment.due_at);
  timesBefore.sort((a, b) => ((b.weeks - a.weeks) || (b.days - a.days) || (b.hours - a.hours)));

  const info = {
    guild_id: guildID,
    course_id: course.id,
    course_name: course.name,
    assignment_id: assignment.id,
    assignment_name: assignment.name,
    due_at: assignment.due_at,
    times: timesBefore,
    channel_ids: channels,
    mentions: mentions,
    memo: memo,
  }
  const job = createReminder(info);
  const reminder = { info: info, job: job };

  // Initialize. Try to schedule reminder at the closest time.
  while (timesBefore.length > 0) {
    const date = beforeDate(dueDate, timesBefore[0]);
    winston.debug('Trying to set reminder at remDate %s, while dueDate at %s.', date, dueDate);
    if (job.schedule(date)) {
      database.storeReminder(guildID, assignment.id, reminder).catch((e) => {
        winston.warn('Could not back-up a reminder: ', e);
      });
      winston.info('Set / updated a reminder at %s, due at %s.', date, dueDate);
      return true;
    }
    timesBefore.shift();
  }

  return false;
}

function cancelReminder(guildID, assignID) {
  database.deleteReminder(guildID, assignID).then((removed) => {
    removed.job.cancel();
  }).catch((e) => {
    winston.warn('Unable to cancel reminder in scheduler: ', e);
  });
}

function cancelGuildReminders(guildID) {
  database.deleteReminder(guildID).then((removed) => {
    removed.job.cancel();
  }).catch((e) => {
    winston.warn('Unable to cancel reminder in scheduler: ', e);
  });
}

// TODO: Stop duplicate subscriptions.
function scheduleSubscribe(guildID, channelID, course, mentions) {
  // fetch assignments
  canvas.fetchAssignments(course.id).then((assigns) => {
    const assignmentIDs = assigns.map(a => a.id);
    
    // create recurrence rule - 6:00AM every day
    const rule = new schedule.RecurrenceRule();
    rule.hour = 14;
    rule.minute = 0;
    rule.second = 0;
    // create job
    const info = {
      guild_id: guildID,
      course_id: course.id,
      course_name: course.name,
      rule: rule,
      channel_id: channelID,
      assignment_ids: assignmentIDs,
      mentions: mentions,
    }
    const job = createSubscribe(info);
    const sub = { info: info, job: job };

    // schedule sub
    if (job.schedule(rule)) {
      database.storeSubscribe(guildID, course.id, sub).catch((e) => {
        winston.warn('Could not back-up a subscription: ', e);
      });
    }
  }).catch((e) => {
    winston.warn('Could not fetch assignments for a new subscribe: ', e);
  });
}

function cancelSubscribe(guildID, courseID) {
  database.deleteSubscribe(guildID, courseID).then((sub) => {
    sub.job.cancel();
  }).catch((e) => {
    winston.warn('Could not cancel job: ', e);
  });
}

function cancelGuildJobs(guildID) {
  database.clearGuildData(guildID).then((guildData) => {
    if (guildData.reminders) {
      for (const r of guildData.reminders) {
        r.job.cancel();
      }
    }

    if (guildData.subscriptions) {
      for (const r of guildData.subscriptions) {
        r.job.cancel();
      }
    }
  }).catch((e) => {
    winston.error(`Unable to cancel and remove guild (ID: ${guild.id}): `, e);
  });
}

// ------------------------------------------------------------------

function createReminder(info) {
  const rem = new schedule.Job(() => {
    // TODO: resolve multiple channels IDs with Promise.all(?) or accumulation

    database.fetchReminder(info.guild_id, info.assignment_id).then((r) => {
      if (!r) throw 'Reminder is not present anymore.';

      // Format the reminder.
      let message = '';
      if (r.info.mentions) {
        const mentions = r.info.mentions.join(' ');
        message = mentions + '\n' + message;
      }
      message = message + `**${r.info.assignment_name}** is due in **${formatTime(r.info.times.shift())}**!`;
      if (r.info.memo) message = message + `\n${r.info.memo}`;

      // Attempt to send the reminder to its specified channels.
      for (const cID of r.info.channel_ids) {
        client.channels.fetch(cID.slice(2, -1)).then((ch) => {
          ch.send(message).catch((e) => {
            r.info.channel_ids.shift();
            winston.verbose("Could not send a channel's reminder: ", e);
          });
        }).catch((e) => {
          winston.verbose(`Could not fetch channel from channel ID: ${cID}`);
        });
      }
      winston.info('Attempted reminder at %s.', new Date());

      // Schedule the next reminder. If impossible, cancel the reminder.
      if (r.info.channel_ids.length > 0) {
        const dueDate = new Date(r.info.due_at);
        while (r.info.times.length > 0) {
          if (rem.reschedule(beforeDate(dueDate, r.info.times[0]))) {
            winston.verbose('Rescheduled a reminder.');
            return;
          }
          r.info.times.shift();
        }
      }

      cancelReminder(r.info.guild_id, r.info.assignment_id);
    }).catch((e) => {
      cancelReminder(r.info.guild_id, r.info.assignment_id);
      winston.warn(e);
    });
  });
  return rem;
}

function createSubscribe(info) {
  const sub = new schedule.Job(() => {
    client.channels.fetch(info.channel_id).then((channel) => {
      if (!channel.guild.available || !channel.viewable) {
        sub.cancel();
        database.removeSubscribe(channel.guild.id, info.course_id);
        return;
      }
  
      // Check for new assignments.
      canvas.fetchAssignments(info.course_id).then((curAssignments) => {
        if (curAssignments === null) return;
  
        if (curAssignments.length > 0) {
          database.fetchSubscribe(channel.guild.id, info.course_id).then((sub) => {
            if (!sub) return;

            const newAssigns = curAssignments.filter(a => !sub.info.assignment_ids.includes(a.id));
            let mentions = '';
            if (sub.info.mentions) mentions = sub.info.mentions.join('');
  
            // Notify if there are new assignments in the guild's tracked courses.
            if (newAssigns.length > 0) {
              const embed = new Discord.MessageEmbed()
                  .setColor('#B8261C')
                  .setTitle('Subscription Update')
                  .setDescription(`You have new assignments for your tracked courses:`)
                  .setTimestamp()
                  .setFooter('Get reminders when an assignment is due with \`remind\`!');
  
              for (const a of newAssigns) {
                embed.addField(`ID: ${a.id} | Last updated: ${a.updated_at}`, a.name);
              }
              channel.send(mentions, embed);
            }
            info.assignment_ids = curAssignments.map(a => a.id);
          }).catch((e) => {
            winston.warn('Failed to fetch old assignments from the database: ', e);
          });
        } else {
          info.assignment_ids = curAssignments.map(a => a.id);
        }
      }).catch((e) => {
        winston.http('Could not fetch course assignments (subscribe): ', e);
      });
    }).catch((e) => {
      winston.warn('Unable to fetch channel (subscribe): ', e);
    });
  });
  return sub;
}

function beforeDate(dueDate, time) {
  const newDate = new Date(dueDate);
  const totalHours = time.hours + (((time.days||0) + ((time.weeks||0) * 7)) * 24);
  newDate.setHours(dueDate.getHours() - totalHours);
  return newDate;
}

function formatTime(timeObject) {
  let message = '';
  if (timeObject.months) {
    message = message + `${timeObject.months} month`;
    if (timeObject.months > 1) message = message + 's';
  }
  if (timeObject.days) {
    if (message != '') message = message + ', '
    message = message + `${timeObject.days} day`;
    if (timeObject.days > 1) message = message + 's';
  }
  if (timeObject.hours) {
    if (message != '') message = message + ', and '
    message = message + `${timeObject.hours} hour`;
    if (timeObject.hours > 1) message = message + 's';
  }
  return message;
}