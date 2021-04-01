const Discord = require('discord.js');

module.exports = {
  name: 'configure',
  description: 'Configure Atelier to use your courses and Canvas URL. Please provide your user ID and the Canvas URL following this pattern: <school>.instructure.com',
  aliases: ['config', 'setup'],
  execute(message, args) {
    configure(message, args);
  },
};

function configure(msg, args) {
  msg.reply('TODO');
}

function setDomain() {

}