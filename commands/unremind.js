const winston = require('winston');

const database = require('../util/database.js');

module.exports = {
  name: 'unremind',
  description: "Removes an active reminder for the given assignment.",
  aliases: ['cancel', 'forget', 'rmremind', 'rmreminder', 'delremind', 'delreminder'],
  usage: '<courseID> <assignmentID>',
  execute(message, args) {
    cancelReminder(message, args);
  },
};

function cancelReminder(msg, args) {
  if (!args || args.length != 1) {
    msg.channel.send('Please specify the reminder by number. It can be found using the *reminders* command.');
    return;
  }

  const numReminder = parseInt(args[0]);
  database.fetchGuildReminders(msg.guild.id).then((reminders) => {
    if (numReminder <= 0 || numReminder > reminders.length) {
      msg.channel.send(`❌ There's no reminder with number ${numReminder}!`);
      return;
    }

    database.deleteReminder(msg.guild.id, reminders[numReminder-1].info.assignment_id).then(() => {
      msg.react('✅');
    }).catch((e) => {
      msg.channel.send('⚠️ An error occurred while deleting the reminder. Please try again.');
      winston.warn('Could not delete reminder in unremind: ', e);
    });
  }).catch((e) => {
    msg.channel.send('⚠️ It looks like an error occurred when retrieving your reminders.');
    winston.http('Fetch guild reminders failed in unremind: ', e);
  });
}