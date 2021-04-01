const Discord = require('discord.js');

module.exports = {
  name: 'greet',
  description: 'Say hi!',
  aliases: ['hello', 'hai', 'hi', 'greeting', 'greetings'],
  execute(message, args) {
    showGreeting(message, args);
  },
};

function showGreeting(msg, args) {
  msg.reply('hello!');
}