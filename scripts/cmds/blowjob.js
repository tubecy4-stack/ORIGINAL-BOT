const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "blowjob",
    aliases: [],
    version: "1.1",
    author: "NeoKEX",
    countDown: 2,
    role: 0,
    description: "Generate a bjob image for a user.",
    category: "fun",
    guide: {
      en: "{pn} @mention\nOr reply to a message."
    }
  },

  onStart: async function ({ api, event }) {
    try {
      const mentions = Object.keys(event.mentions || {});
      let targetUID;

      if (event.messageReply) {
        targetUID = event.messageReply.senderID;
      } else if (mentions.length > 0) {
        targetUID = mentions[0];
      } else {
        return api.sendMessage("Please reply to a message or mention a user to use this command.", event.threadID, event.messageID);
      }
      
      const url = `https://neokex-apis.onrender.com/bjob?uid=${targetUID}`;
      
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      
      const filePath = path.join(__dirname, "cache", `bjob_${targetUID}.jpg`);
      fs.writeFileSync(filePath, Buffer.from(response.data, "binary"));

      api.sendMessage({
        body: `Ummm uhhh 👄🫦👅`,
        attachment: fs.createReadStream(filePath)
      }, event.threadID, () => fs.unlinkSync(filePath), event.messageID);

    } catch (e) {
      console.error("Error:", e.message);
      api.sendMessage("❌ Couldn't generate image. Try again later.", event.threadID, event.messageID);
    }
  }
};
