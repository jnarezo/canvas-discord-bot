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

const mongoURI = process.env.DB_URI || '';
const dbName = process.env.DB_NAME || '';

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

  if (mongoURI) {
    winston.verbose('Connecting to database..');
    const db = await MongoClient.connect(mongoURI);
    const dbo = db.db(dbName);
  
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
    const result = await dbo.collection('subscriptions').updateOne(query, newSub, { upsert: true });
    winston.verbose('Added a subscription.');
    db.close();
  }
}

async function fetchSubscribe(guildID, courseID) {
  if (mongoURI) {
    winston.verbose('Connecting to database..');
    const db = await MongoClient.connect(mongoURI);
    const dbo = db.db(dbName);
    const query = {
      guild_id: guildID,
      course_id: courseID,
    };
    const sub = await dbo.collection('subscriptions').findOne(query);
    
    if (newAssigns) {
      dbo.collection('subscriptions').findOneAndUpdate(query, { $set: { assignments: newAssigns } });
    }
    db.close();
  }

  return storage.getSubscription(guildID, courseID);
}

async function deleteSubscribe(guildID, courseID) {
  if (mongoURI) {
    winston.verbose('Connecting to database..');
    const db = await MongoClient.connect(mongoURI);
    const dbo = db.db(dbName);
    const query = {
      guild_id: guildID,
      course_id: courseID,
    };
    await dbo.collection('subscriptions').deleteOne(query);
    db.close();
  }

  return storage.deleteSubscription(guildID, courseID);
}

async function fetchGuildSubs(guildID) {
  if (mongoURI) {
    winston.verbose('Connecting to database..');
    const db = await MongoClient.connect(mongoURI);
    const dbo = db.db(dbName);
    const query = { guild_id: guildID };
    const subs = await dbo.collection('subscriptions').find(query).toArray();
    db.close();
    return subs;
  }

  return storage.getAllSubscriptions(guildID);
}

async function storeReminder(guildID, assignID, reminder) {
  storage.addReminder(guildID, assignID, reminder);

  if (mongoURI) {
    winston.verbose('Connecting to database..');
    const db = await MongoClient.connect(mongoURI);
    const dbo = db.db(dbName);

    const query = {
      guild_id: info.guild_id,
      assignment_id: info.assignment_id,
    };
    const newRem = {
      $set: {
        info: info,
      }
    };
    const result = await dbo.collection('reminders').updateOne(query, newRem, { upsert: true });
    winston.verbose('Added a reminder.');
    db.close();
  }
}

async function fetchReminder(guildID, assignID) {
  return storage.getReminder(guildID, assignID);
}

async function deleteReminder(guildID, assignID) {
  if (mongoURI) {
    const db = await MongoClient.connect(mongoURI);
    const dbo = db.db(dbName);
    const query = {
      guild_id: guildID,
      assignment_id: assignID,
    };
    await dbo.collection('reminders').deleteOne(query);
    db.close();
  }

  return storage.deleteReminder(guildID, assignID);
}

async function fetchGuildReminders(guildID) {
  if (mongoURI) {
    const db = await MongoClient.connect(mongoURI);
    const dbo = db.db(dbName);
    const query = { guild_id: guildID };
    const reminders = await dbo.collection('reminders').find(query).toArray();
    db.close();
    return reminders;
  }

  return storage.getAllReminders(guildID);
}

async function fetchAllReminders() {
  if (mongoURI) {
    const db = await MongoClient.connect(mongoURI);
    const dbo = db.db(dbName);
    const reminders = await dbo.collection('reminders').find({}).toArray();
    db.close();
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
  if (mongoURI) {
    const db = await MongoClient.connect(mongoURI);
    const dbo = db.db(dbName);
    const query = { guild_id: guildID };
    await dbo.collection('subscriptions').deleteMany(query);
    await dbo.collection('reminders').deleteMany(query);
    db.close();
  }

  return storage.deleteGuildData(guildID);
}