const schedule = require('node-schedule');
const winston = require('winston');

const database = require("./database");

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

// TODO: Add restore subscriptions.
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

function scheduleReminder(guildID, course, assignment, timesBefore, channels, mentions, memo) {
  const dueDate = new Date(assignment.due_at);
  timesBefore.sort((a, b) => ((b.weeks - a.weeks) || (b.days - a.days) || (b.hours - a.hours)));

  const info = {
    guild_id: guildID,
    times: timesBefore,
    channel_ids: channels,
    mentions: mentions,
    memo: memo,
    course_id: course.id,
    course_name: course.name,
    assignment_id: assignment.id,
    assignment_name: assignment.name,
    due_at: assignment.due_at,
  }
  const job = createReminder(guildID, assignment.id);

  // Initialize. Try to schedule reminder at the closest time.
  while (timesBefore.length > 0) {
    const date = beforeDate(dueDate, timesBefore[0]);
    winston.debug('Trying to set reminder at remDate %s, while dueDate at %s.', date, dueDate);
    if (job.schedule(date)) {
      database.storeReminder(info, job).catch((e) => {
        winston.warn('Could not back-up a reminder: ', e);
      });
      winston.info('Set / updated a reminder at %s, due at %s.', date, dueDate);
      return true;
    }
    timesBefore.shift();
  }

  return false;
}

function cancelReminder(guildID, courseID, assignID) {
  database.deleteReminder(guildID, courseID, assignID).then((removed) => {
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

// TODO
function scheduleSubscribe(guildID, channelID, course, mentions) {
  // fetch assignments
  const assignmentIDs = [];
  // create recurrence rule
  const rule = new schedule.RecurrenceRule();
  rule.hour = 6;
  rule.minute = 0;
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
  // schedule sub
  if (job.schedule(rule)) {
    // database.store
    database.storeSubscribe(info, job).catch((e) => {
      winston.warn('Could not back-up a subscription: ', e);
    });
    return true;
  }
  return false;
}

// TODO
function cancelSubscribe(guildID, courseID) {
  database.deleteSubscribe(guildID, courseID).then((removed) => {
    removed.job.cancel();
  }).catch((e) => {

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

function createReminder(guildID, assignID) {
  const rem = new schedule.Job(() => {
    database.fetchReminder(guildID, assignID).then((r) => {
      if (!r.info) throw 'Reminder is not present anymore.';

      // Format the reminder.
      let message = '';
      if (r.info.mentions) {
        for (const m of r.info.mentions) {
          message = `${m} ` + message;
        }
        message = message + '\n';
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

// TODO
function createSubscribe(info) {
  const sub = new schedule.Job(() => {
    if (!channel.guild.available || !channel.viewable) {
      job.cancel();
      database.removeSubscribe(channel.guild.id, courseID);
      return;
    }

    // Check for new assignments.
    canvas.fetchAssignments(courseID).then((upcoming) => {
      if (upcoming === null) return;

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
        }).catch((e) => {
          winston.warn('Failed to fetch old assignments from the database: ', e);
        });
      }

      database.storeSubscribe(channel, courseID, upcomingIDs).catch((e) => {
        winston.warn('Could not update a course subscription in the database: ', e);
      });
    }).catch((e) => {
      winston.http('Could not fetch course assignments (subscribe): ', e);
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