const fs = require("fs-extra");
const Canvas = require("canvas");
const axios = require("axios");
const path = require("path");

module.exports = {
	config: {
		name: "welcome",
		version: "3.0",
		author: "NTKhang + Modified by ChatGPT",
		countDown: 5,
		role: 0,
		category: "fun",
		description: "Send a welcome message manually with a welcome card image",
		guide: {
			en: "{pn} @mention or {pn} <userID>"
		}
	},

	langs: {
		en: {
			noMention: "⚠️ Please mention someone or provide their Facebook ID.",
			success: "✅ Welcome message sent successfully!",
			session1: "morning",
			session2: "noon",
			session3: "afternoon",
			session4: "evening",
			defaultWelcomeMessage: "Hello {userName}.\nWelcome to {boxName}!\nHave a nice {session} 😊"
		}
	},

	onStart: async function ({ api, event, args, message, usersData, threadsData, getLang }) {
		try {
			const { threadID, mentions } = event;
			const prefix = global.utils.getPrefix(threadID);
			const hours = new Date().getHours();

			let uid, userName;

			// === Mention or ID input ===
			if (Object.keys(mentions).length > 0) {
				uid = Object.keys(mentions)[0];
				userName = mentions[uid];
			} else if (args[0]) {
				uid = args[0].replace(/[^0-9]/g, "");
				const userInfo = await api.getUserInfo(uid);
				userName = userInfo[uid]?.name || `User ${uid}`;
			} else {
				return message.reply(getLang("noMention"));
			}

			const threadData = await threadsData.get(threadID);
			const threadName = threadData.threadName || "this group";
			const memberCount = (await api.getThreadInfo(threadID)).participantIDs.length;

			// === Choose time session ===
			const session =
				hours <= 10
					? getLang("session1")
					: hours <= 12
					? getLang("session2")
					: hours <= 18
					? getLang("session3")
					: getLang("session4");

			// === Default message ===
			let welcomeMessage =
				threadData.data?.welcomeMessage || getLang("defaultWelcomeMessage");

			welcomeMessage = welcomeMessage
				.replace(/\{userName\}/g, userName)
				.replace(/\{boxName\}/g, threadName)
				.replace(/\{session\}/g, session);

			const form = { body: welcomeMessage };

			// === Generate Welcome Card ===
			try {
				const cardBuffer = await makeWelcomeCard(userName, uid, threadName, memberCount);
				if (cardBuffer) {
					const filePath = path.join(__dirname, `welcome_${uid}.png`);
					fs.writeFileSync(filePath, cardBuffer);
					form.attachment = fs.createReadStream(filePath);
					await message.reply(form);
					fs.unlinkSync(filePath);
				} else {
					await message.reply(form);
				}
			} catch (e) {
				console.error("Card creation error:", e);
				await message.reply(form);
			}

			return message.reply(getLang("success"));
		} catch (err) {
			console.error(err);
			return message.reply("❌ Error while sending welcome message.");
		}
	}
};

// === Create Welcome Card Function ===
async function makeWelcomeCard(userName, uid, boxName, memberCount) {
	try {
		const width = 1365, height = 600;
		const canvas = Canvas.createCanvas(width, height);
		const ctx = canvas.getContext("2d");

		// === Background (Imgur) ===
		try {
			const bgImg = await Canvas.loadImage("https://i.imgur.com/Stwa6av.gif");
			ctx.drawImage(bgImg, 0, 0, width, height);
		} catch {
			ctx.fillStyle = "#5565d6";
			ctx.fillRect(0, 0, width, height);
		}

		// === Avatar ===
		let avatarImg = null;
		try {
			const res = await axios.get(
				`https://kaiz-apis.gleeze.com/api/facebookpfp?uid=${uid}&apikey=66e0cfbb-62b8-4829-90c7-c78cacc72ae2`,
				{ responseType: "arraybuffer", timeout: 8000 }
			);
			avatarImg = await Canvas.loadImage(Buffer.from(res.data));
		} catch {
			avatarImg = null;
		}

		const avatarSize = 220;
		const avatarX = width / 2;
		const avatarY = height * 0.33;

		ctx.save();
		ctx.beginPath();
		ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
		ctx.closePath();
		ctx.clip();
		if (avatarImg)
			ctx.drawImage(avatarImg, avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize);
		ctx.restore();

		// === Text ===
		ctx.textAlign = "center";
		ctx.fillStyle = "#41E7FF";
		ctx.font = "bold 64px 'Segoe UI', Arial";
		ctx.fillText(userName, avatarX, avatarY + avatarSize / 2 + 70);

		ctx.fillStyle = "#fff";
		ctx.font = "600 36px 'Segoe UI', Arial";
		ctx.fillText(`Welcome to ${boxName}`, avatarX, avatarY + avatarSize / 2 + 120);

		ctx.font = "500 32px 'Segoe UI', Arial";
		ctx.fillText(`You're the ${memberCount}th member`, avatarX, avatarY + avatarSize / 2 + 165);

		return canvas.toBuffer("image/png");
	} catch (err) {
		console.error("[makeWelcomeCard] error:", err);
		return null;
	}
}
