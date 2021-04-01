const winston = require('winston');
const { MongoClient } = require('mongodb');

const storage = require('./storage');

module.exports = {
  storeReminder: storeReminder,
  fetchReminder: fetchReminder,
  deleteReminder: deleteReminder,
  fetchGuildReminders: fetchGuildReminders,
  fetchAllReminders: fetchAllReminders,
  storeSubscribe: storeSubscribe,
  fetchSubscribe: fetchSubscribe,
  deleteSubscribe: deleteSubscribe,
  fetchGuildSubs: fetchGuildSubs,
  clearGuildData: clearGuildData,
}

const mongoURI = process.env.MONGODB_URI;
let client;
let database;

async function tryMongoConnect() {
  if (!mongoURI) return false;

  if (!(client && client.isConnected())) {
    try {
      client = new MongoClient(mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      await client.connect();
      database = client.db();
      winston.info('Connected to MongoDB.');
    } catch (e) {
      winston.warn('Cannot connect to the database!');
      return false;
    }
  }
  return true;
}

/**
 * Async. Stores a guild's subscription in the remote Mongo database. A guild
 * may only have 1 subscription per course at any given time. If a subscription
 * already exists, its assignment IDs will be updated.
 * @param {*} channel 
 * @param {*} courseID 
 * @param {*} assignmentIDs 
 */
async function storeSubscribe(guildID, courseID, subscription) {
  storage.addSubscription(guildID, courseID, subscription);

  if (await tryMongoConnect()) {
    const query = {
      guild_id: info.guild_id,
      course_id: info.course_id,
    };
    const newSub = {
      $set: {
        rule: info.rule,
        channel_id: info.channel_id,
        courses: info.courses,
      },
    };
    await database.collection('subscriptions').updateOne(query, newSub, { upsert: true });
    winston.verbose('Added a subscription.');
  }
}

async function fetchSubscribe(guildID, courseID) {
  if (await tryMongoConnect()) {
    const query = {
      guild_id: guildID,
      course_id: courseID,
    };
    const sub = await database.collection('subscriptions').findOne(query);
    
    if (newAssigns) {
      database.collection('subscriptions').findOneAndUpdate(query, { $set: { assignments: newAssigns } });
    }
    return sub;
  }

  return storage.getSubscription(guildID, courseID);
}

async function deleteSubscribe(guildID, courseID) {
  if (await tryMongoConnect()) {
    winston.verbose('Connecting to database..');
    const query = {
      guild_id: guildID,
      course_id: courseID,
    };
    await database.collection('subscriptions').deleteOne(query);
  }

  return storage.deleteSubscription(guildID, courseID);
}

async function fetchGuildSubs(guildID) {
  if (await tryMongoConnect()) {
    const query = { guild_id: guildID };
    const subs = await database.collection('subscriptions').find(query).toArray();
    return subs;
  }

  return storage.getAllSubscriptions(guildID);
}

async function storeReminder(guildID, assignID, reminder) {
  storage.addReminder(guildID, assignID, reminder);

  if (await tryMongoConnect()) {
    const query = {
      guild_id: guildID,
      assignment_id: assignID,
    };
    const newRem = {
      $set: {
        info: reminder.info,
      },
    };
    await database.collection('reminders').updateOne(query, newRem, { upsert: true });
    winston.verbose('Added a reminder.');
  }
}

async function fetchReminder(guildID, assignID) {
  if (await tryMongoConnect()) {
    const query = {
      guild_id: guildID,
      assignment_id: assignID,
    };
    const reminder = await database.collection('reminders').findOne(query);
    return reminder;
  }

  return storage.getReminder(guildID, assignID);
}

async function deleteReminder(guildID, assignID) {
  if (await tryMongoConnect()) {
    const query = {
      guild_id: guildID,
      assignment_id: assignID,
    };
    await database.collection('reminders').deleteOne(query);
  }

  return storage.deleteReminder(guildID, assignID);
}

async function fetchGuildReminders(guildID) {
  if (await tryMongoConnect()) {
    const query = { guild_id: guildID };
    const reminders = await database.collection('reminders').find(query).toArray();
    return reminders;
  }

  return storage.getAllReminders(guildID);
}

async function fetchAllReminders() {
  if (await tryMongoConnect()) {
    const reminders = await database.collection('reminders').find({}).toArray();
    return reminders;
  }

  return undefined;
}

// TODO
async function storeGuildConfig() {
  
}

// TODO
async function fetchGuildConfig() {

}

async function fetchGuildData(guildID) {
  return storage.getGuildData(guildID);
}

async function clearGuildData(guildID) {
  if (await tryMongoConnect()) {
    const query = { guild_id: guildID };
    await database.collection('subscriptions').deleteMany(query);
    await database.collection('reminders').deleteMany(query);
  }

  return storage.deleteGuildData(guildID);
}