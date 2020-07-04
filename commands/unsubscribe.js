const winston = require('winston');
const Discord = require('discord.js');

const database = require('../util/database.js');

module.exports = {
  name: 'unsubscribe',
  description: "Removes your server's assignment updates for the given course.",
  aliases: ['unsub', 'unfollow'],
  usage: '<courseID>',
  execute(message, args) {
    unsubscribe(message, args);
  },
};

function unsubscribe(msg, args) {
  if (!args || args.length < 1) {
    msg.channel.send("Please specify the course's ID.");
    return;
  }

  const numSub = args[0];
  database.deleteSubscribe(msg.guild.id, numSub).then(() => {
    msg.react('✅');
  }).catch((e) => {
    msg.channel.send('⚠️ An error occurred while unsubscribing. Please check the course ID.');
  });
}