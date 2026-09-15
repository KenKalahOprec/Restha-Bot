import { MongoClient } from 'mongodb';
import { proto, initAuthCreds, BufferJSON } from '@whiskeysockets/baileys';

/**
 * MongoDB Auth State adapter for Baileys
 * Handles cloud session storage so session persists across ephemeral containers (Render, Koyeb, etc.)
 */
export async function useMongoAuthState(mongoUri, sessionName = 'baileys_session') {
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db();
  const collection = db.collection(sessionName);

  const writeData = async (id, data) => {
    const serialized = JSON.stringify(data, BufferJSON.replacer);
    await collection.updateOne(
      { _id: id },
      { $set: { data: serialized, updatedAt: new Date() } },
      { upsert: true }
    );
  };

  const readData = async (id) => {
    const doc = await collection.findOne({ _id: id });
    if (!doc?.data) return null;
    try {
      return JSON.parse(doc.data, BufferJSON.reviver);
    } catch {
      return null;
    }
  };

  const removeData = async (id) => {
    await collection.deleteOne({ _id: id });
  };

  const creds = (await readData('creds')) || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}`);
              if (type === 'app-state-sync-key' && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              data[id] = value;
            })
          );
          return data;
        },
        set: async (data) => {
          const tasks = [];
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              const key = `${category}-${id}`;
              tasks.push(value ? writeData(key, value) : removeData(key));
            }
          }
          await Promise.all(tasks);
        }
      }
    },
    saveCreds: () => writeData('creds', creds),
    clearAuth: async () => {
      await collection.deleteMany({});
    }
  };
}

