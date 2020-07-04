const winston = require('winston');
const { MongoClient } = require('mongodb');

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

const { dbName } = require('../config.json');

// TODO: use Collections for reminders/subscriptions
const guildStorage = {};

/**
 * Async. Stores a guild's subscription in the remote Mongo database. A guild
 * may only have 1 subscription per course at any given time. If a subscription
 * already exists, its assignment IDs will be updated.
 * @param {*} channel 
 * @param {*} courseID 
 * @param {*} assignmentIDs 
 */
async function storeSubscribe(info, job) {
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

  if (!guildStorage[info.guild_id]) guildStorage[info.guild_id] = {};
  if (!guildStorage[info.guild_id].subscriptions) guildStorage[info.guild_id].subscriptions = [];
  guildStorage[info.guild_id].subscriptions.push({info: info, job: job});
}

async function fetchSubscribe(guildID, courseID, newAssigns = null) {
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
  return sub;
}

async function deleteSubscribe(guildID, courseID) {
  const db = await MongoClient.connect(mongoURI);
  const dbo = db.db(dbName);
  const query = {
    guild_id: guildID,
    course_id: courseID,
  };
  await dbo.collection('subscriptions').deleteOne(query);
  db.close();
}

async function fetchGuildSubs(guildID) {
  if (mongoURI) {
    const db = await MongoClient.connect(mongoURI);
    const dbo = db.db(dbName);
    const query = { guild_id: guildID };
    const subs = await dbo.collection('subscriptions').find(query).toArray();
    db.close();
    return subs;
  }
  return null;
}

async function storeReminder(info, job) {
  if (!guildStorage[info.guild_id]) guildStorage[info.guild_id] = {};
  if (!guildStorage[info.guild_id].reminders) guildStorage[info.guild_id].reminders = [];
  guildStorage[info.guild_id].reminders.push({info: info, job: job});

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
  if (guildStorage[guildID] && guildStorage[guildID].reminders) {
    return guildStorage[guildID].reminders.find(r => (r.info.assignment_id == assignID));
  }
  return null;
}

async function deleteReminder(guildID, assignID) {
  const deleted = await fetchReminder(guildID, assignID);
  if (deleted) {
    guildStorage[guildID].reminders.splice(guildStorage[guildID].reminders.indexOf(deleted)-1, 1);
  }
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
  return deleted;
}

async function fetchGuildReminders(guildID) {
  const db = await MongoClient.connect(mongoURI);
  const dbo = db.db(dbName);
  const query = { guild_id: guildID };
  const reminders = await dbo.collection('reminders').find(query).toArray();
  db.close();
  return reminders;
}

async function fetchAllReminders() {
  if (mongoURI) {
    const db = await MongoClient.connect(mongoURI);
    const dbo = db.db(dbName);
    const reminders = await dbo.collection('reminders').find({}).toArray();
    db.close();
    return reminders;
  }

  return [];
}

// TODO
async function storeGuildConfig() {
  
}

// TODO
async function fetchGuildConfig() {

}

async function fetchGuildData(guildID) {
  return guildStorage[guildID];
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

  const guildData = await fetchGuildData(guildID);
  if (guildData) guildStorage.splice(guildStorage.indexOf(guildData)-1, 1);
  return guildData;
}

function checkData(guildID) {

}