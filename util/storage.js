module.exports = {
  addSubscription: addSubscription,
  getSubscription: getSubscription,
  deleteSubscription: deleteSubscription,
  addReminder: addReminder,
  getReminder: getReminder,
  deleteReminder: deleteReminder,
  getAllSubscriptions: getAllSubscriptions,
  getAllReminders: getAllReminders,
  getGuildData: getGuildData,
  deleteGuildData: deleteGuildData,
}

const cache = {};

function addSubscription(guildID, courseID, sub) {
  if (!cache[guildID]) createGuildData(guildID);
  cache[guildID].subscriptions.set(courseID, sub);
}

function getSubscription(guildID, courseID) {
  return (cache[guildID]) ? cache[guildID].subscriptions.get(courseID) : undefined;
}

function deleteSubscription(guildID, courseID) {
  const sub = getSubscription(guildID, courseID);
  if (sub) cache[guildID].subscriptions.delete(courseID);
  return sub;
}

function addReminder(guildID, assignID, reminder) {
  if (!cache[guildID]) createGuildData(guildID);
  cache[guildID].reminders.set(assignID, reminder);
}

function getReminder(guildID, assignID) {
  return (cache[guildID]) ? cache[guildID].reminders.get(assignID) : undefined;
}

function deleteReminder(guildID, assignID) {
  const reminder = getReminder(guildID, assignID);
  if (reminder) cache[guildID].reminders.delete(assignID);
  return reminder;
}

function getAllSubscriptions(guildID) {
  return (cache[guildID]) ? [...cache[guildID].subscriptions.values()] : undefined;
}

function getAllReminders(guildID) {
  return (cache[guildID]) ? [...cache[guildID].reminders.values()] : undefined
}

function getGuildData(guildID) {
  return cache[guildID];
}

function deleteGuildData(guildID) {
  const guildData = cache[guildID];
  if (guildData) delete cache[guildID];
  return guildData;
}

// ------ Helper Methods --------------------------------------------------

function createGuildData(guildID) {
  cache[guildID] = {
    reminders: new Map(),
    subscriptions: new Map(),
  }
}