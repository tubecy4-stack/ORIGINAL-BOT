const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "gay",
    aliases: [],
    version: "1.4",
    author: "NeoKEX",
    countDown: 2,
    role: 0,
    description: "Generate a gay image with two user IDs.",
    category: "fun",
    guide: {
      en: "{pn} @mention\nOr reply to a message.\nWithout mention or reply, it will ask you to mention a user."
    }
  },

  onStart: async function ({ api, event }) {
    try {
      const mentions = Object.keys(event.mentions || {});
      let uid1 = event.senderID;
      let uid2;
      let uid2Name = "user"; // Default name

      if (event.messageReply) {
        uid2 = event.messageReply.senderID;
        const threadInfo = await api.getThreadInfo(event.threadID);
        const userInfo = threadInfo.participantIDs.find(u => u == uid2);
        if (userInfo) {
          uid2Name = userInfo.name || "user";
        }
      } else if (mentions.length > 0) {
        uid2 = mentions[0];
        uid2Name = event.mentions[uid2] || "user";
      } else {
        return api.sendMessage("Please reply to a message or mention a user to use this command.", event.threadID, event.messageID);
      }

      const url = `https://neokex-apis.onrender.com/gay?uid1=${uid1}&uid2=${uid2}`;
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const filePath = path.join(__dirname, "cache", `gay_${uid1}_${uid2}.jpg`);
      fs.writeFileSync(filePath, Buffer.from(response.data, "binary"));

      const messageBody = `Ohh yeah, ${uid2Name}`;
      const messageMentions = [{
        tag: uid2Name,
        id: uid2
      }];

      api.sendMessage({
        body: messageBody,
        attachment: fs.createReadStream(filePath),
        mentions: messageMentions
      }, event.threadID, () => fs.unlinkSync(filePath), event.messageID);

    } catch (e) {
      console.error("Error:", e.message);
      api.sendMessage("❌ Couldn't generate image. Try again later.", event.threadID, event.messageID);
    }
  }
};
