
const fs = require('fs');
const moment = require('moment-timezone');

module.exports = {
 config: {
  name: "info",
 aliases: ["owner", "botinfo" ],
  version: "1.0",
  author: 🌞",
  countDown: 20,
  role: 0,
  shortDescription: { vi: "", en: "" },
  longDescription: { vi: "", en: "" },
  category: "owner",
  guide: { en: "" },
  envConfig: {}
 },
 onStart: async function ({ message }) {
  const authorName = " Ibne Saad X Choklet";
  const ownAge = "『17+』";
  const messenger = " //";
  const authorFB = " //https://www.facebook.com/share/1FDmLQQCWH/";
  const authorNumber = "+8801717135872";
  const Status = "⩸____⩸";
  const urls = [
"https://drive.google.com/uc?export=view&id=1mzJeualLnMS-wABThyCQFfJsX-2hMADG",
"https://drive.google.com/uc?export=view&id=14M_Qx2OfCQhybST0tAzQ4QEqT7COD6Z1"
];
  const link = urls[Math.floor(Math.random() * urls.length)];
  const now = moment().tz('Asia/Jakarta');
  const date = now.format('MMMM Do YYYY');
  const time = now.format('h:mm:ss A');
  const uptime = process.uptime();
  const seconds = Math.floor(uptime % 60);
  const minutes = Math.floor((uptime / 60) % 60);
  const hours = Math.floor((uptime / (60 * 60)) % 24);
  const days = Math.floor(uptime / (60 * 60 * 24));
  const uptimeString = `${days} days ${hours} hours ${minutes} minutes ${seconds} seconds`;

  message.reply({
   body: `✨《 𝐁𝐨𝐭 KRATOS A I 》🎀
\🤖彡BOT NAME : ${global.GoatBot.config.KRATOS A I}
\👾彡BOT SYSTEM PREFIX : { . } ${global.GoatBot.config.prefix}
\💙彡OWNER NAME : ${Ibne Saad}
\📝彡AGE : ${17+}
\💕彡RELATIONSHIP: ${Single}
\🌐彡WHATSAPP : ${01717135872}
\🌍彡𝐹𝑎𝑐𝑒𝑏𝑜𝑜𝑘 𝐿𝑖𝑛𝑘 : ${https://www.facebook.com/share/1aEk95e8Pb/}
\🗓彡DATE : ${date}
\⏰彡NOW TIME : ${time}
\🔰彡ANY HELP CONTACT : ${01717135872}__⩸
\📛彡BOT IS RUNNING FOR : ${uptimeString}
\===============`,
   attachment: await global.utils.getStreamFromURL(link)
  });
 },
 onChat: async function ({ event, message, getLang }) {
  if (event.body && event.body.toLowerCase() === "info") {
   this.onStart({ message });
  }
 }
};
