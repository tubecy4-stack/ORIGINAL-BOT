module.exports.config = {
  name: "hack",
  version: "1.0.1",
  permission: 0,
  credits: "Nayan",
  description: "example (improved)",
  prefix: true,
  category: "Fun",
  usages: "user",
  cooldowns: 5,
  dependencies: {
    "axios": "",
    "fs-extra": ""
  }
};

module.exports.wrapText = (ctx, name, maxWidth) => {
  return new Promise(resolve => {
    if (ctx.measureText(name).width < maxWidth) return resolve([name]);
    if (ctx.measureText('W').width > maxWidth) return resolve(null);
    const words = name.split(' ');
    const lines = [];
    let line = '';
    while (words.length > 0) {
      let split = false;
      while (ctx.measureText(words[0]).width >= maxWidth) {
        const temp = words[0];
        words[0] = temp.slice(0, -1);
        if (split) words[1] = `${temp.slice(-1)}${words[1]}`;
        else {
          split = true;
          words.splice(1, 0, temp.slice(-1));
        }
      }
      if (ctx.measureText(`${line}${words[0]}`).width < maxWidth) line += `${words.shift()} `;
      else {
        lines.push(line.trim());
        line = '';
      }
      if (words.length === 0) lines.push(line.trim());
    }
    return resolve(lines);
  });
};

module.exports.run = async function ({ args, Users, Threads, api, event, Currencies }) {
  const { loadImage, createCanvas } = require("canvas");
  const fs = global.nodemodule["fs-extra"];
  const axios = global.nodemodule["axios"];
  const path = require("path");

  // temp paths
  const cacheDir = path.join(__dirname, "cache");
  await fs.ensureDir(cacheDir);
  const pathImg = path.join(cacheDir, "background.png");
  const pathAvt1 = path.join(cacheDir, "Avtmot.png");

  try {
    // choose id: first mentioned user or sender
    const mentionIds = Object.keys(event.mentions || {});
    const id = mentionIds.length > 0 ? mentionIds[0] : event.senderID;
    const name = await Users.getNameUser(id);

    // thread info (not used now but kept if needed)
    // const ThreadInfo = await api.getThreadInfo(event.threadID);

    const backgrounds = [
      "https://drive.google.com/uc?id=1RwJnJTzUmwOmP3N_mZzxtp63wbvt9bLZ"
      // add more URLs if desired
    ];
    const rd = backgrounds[Math.floor(Math.random() * backgrounds.length)];

    // get avatar (binary)
    const getAvtmot = (await axios.get(
      `https://graph.facebook.com/${id}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`,
      { responseType: "arraybuffer" }
    )).data;
    await fs.writeFile(pathAvt1, Buffer.from(getAvtmot));

    // get background (binary)
    const getbackground = (await axios.get(rd, { responseType: "arraybuffer" })).data;
    await fs.writeFile(pathImg, Buffer.from(getbackground));

    // load images
    const baseImage = await loadImage(pathImg);
    const baseAvt1 = await loadImage(pathAvt1);

    // create canvas and draw
    const canvas = createCanvas(baseImage.width, baseImage.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);

    // text config
    ctx.font = "400 23px Arial";
    ctx.fillStyle = "#1878F3";
    ctx.textAlign = "start";

    // wrap text and draw each line separately (canvas doesn't handle '\n')
    const maxTextWidth = 1160; // same as your original
    const lines = await this.wrapText(ctx, name, maxTextWidth) || [name];
    const startX = 200;
    const startY = 497;
    const lineHeight = 28; // adjust if needed
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], startX, startY + (i * lineHeight));
    }

    // draw avatar - adjust coordinates/size if needed
    ctx.beginPath();
    ctx.drawImage(baseAvt1, 83, 437, 100, 101);

    // export
    const imageBuffer = canvas.toBuffer();
    await fs.writeFile(pathImg, imageBuffer);

    // send and cleanup
    await api.sendMessage(
      { body: ``, attachment: fs.createReadStream(pathImg) },
      event.threadID,
      () => {
        try { fs.unlinkSync(pathImg); } catch (e) {}
      },
      event.messageID
    );

    // remove avatar temp
    try { await fs.remove(pathAvt1); } catch (e) {}

  } catch (err) {
    console.error(err);
    // attempt cleanup
    try { if (await fs.pathExists(pathImg)) await fs.remove(pathImg); } catch (e) {}
    try { if (await fs.pathExists(pathAvt1)) await fs.remove(pathAvt1); } catch (e) {}

    return api.sendMessage(`Đã xảy ra lỗi khi chạy lệnh: ${err.message || err}`, event.threadID, event.messageID);
  }
};
