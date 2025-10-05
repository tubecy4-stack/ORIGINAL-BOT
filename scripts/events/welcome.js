const { getTime, drive } = global.utils;
const Canvas = require("canvas");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

if (!global.temp.welcomeEvent)
	global.temp.welcomeEvent = {};

module.exports = {
	config: {
		name: "welcome",
		version: "2.0",
		author: "NTKhang + Modified by ChatGPT",
		category: "events"
	},

	langs: {
		en: {
			session1: "morning",
			session2: "noon",
			session3: "afternoon",
			session4: "evening",
			welcomeMessage: "Thank you for inviting me to the group!\nBot prefix: %1\nTo view the list of commands, please enter: %1help",
			multiple1: "you",
			multiple2: "you guys",
			defaultWelcomeMessage: `Hello {userName}.\nWelcome {multiple} to the chat group: {boxName}\nHave a nice {session} 😊`
		}
	},

	onStart: async ({ threadsData, message, event, api, getLang }) => {
		if (event.logMessageType != "log:subscribe") return;
		return async function () {
			const hours = getTime("HH");
			const { threadID } = event;
			const prefix = global.utils.getPrefix(threadID);
			const dataAddedParticipants = event.logMessageData.addedParticipants;

			// যদি bot কে add করে
			if (dataAddedParticipants.some((item) => item.userFbId == api.getCurrentUserID())) {
				return message.send(getLang("welcomeMessage", prefix));
			}

			if (!global.temp.welcomeEvent[threadID])
				global.temp.welcomeEvent[threadID] = {
					joinTimeout: null,
					dataAddedParticipants: []
				};

			global.temp.welcomeEvent[threadID].dataAddedParticipants.push(...dataAddedParticipants);
			clearTimeout(global.temp.welcomeEvent[threadID].joinTimeout);

			global.temp.welcomeEvent[threadID].joinTimeout = setTimeout(async function () {
				const threadData = await threadsData.get(threadID);
				if (threadData.settings.sendWelcomeMessage == false) return;

				const dataAddedParticipants = global.temp.welcomeEvent[threadID].dataAddedParticipants;
				const threadName = threadData.threadName;
				const userName = [], mentions = [];
				let multiple = false;

				if (dataAddedParticipants.length > 1) multiple = true;

				for (const user of dataAddedParticipants) {
					userName.push(user.fullName);
					mentions.push({ tag: user.fullName, id: user.userFbId });
				}
				if (userName.length == 0) return;

				let { welcomeMessage = getLang("defaultWelcomeMessage") } = threadData.data;
				const form = { mentions: welcomeMessage.match(/\{userNameTag\}/g) ? mentions : null };

				welcomeMessage = welcomeMessage
					.replace(/\{userName\}|\{userNameTag\}/g, userName.join(", "))
					.replace(/\{boxName\}|\{threadName\}/g, threadName)
					.replace(/\{multiple\}/g, multiple ? getLang("multiple2") : getLang("multiple1"))
					.replace(/\{session\}/g, hours <= 10 ? getLang("session1") : hours <= 12 ? getLang("session2") : hours <= 18 ? getLang("session3") : getLang("session4"));

				form.body = welcomeMessage;

				// যদি custom attachment থাকে
				if (threadData.data.welcomeAttachment) {
					const files = threadData.data.welcomeAttachment;
					const attachments = files.reduce((acc, file) => {
						acc.push(drive.getFile(file, "stream"));
						return acc;
					}, []);
					form.attachment = (await Promise.allSettled(attachments))
						.filter(({ status }) => status == "fulfilled")
						.map(({ value }) => value);
				}

				// === Welcome Card যুক্ত করা ===
				try {
					for (const user of dataAddedParticipants) {
						const memberCount = (await api.getThreadInfo(threadID)).participantIDs.length;
						const cardBuffer = await makeWelcomeCard(user.fullName, user.userFbId, threadName, memberCount);
						if (cardBuffer) {
							const filePath = path.join(__dirname, `welcome_${user.userFbId}.png`);
							fs.writeFileSync(filePath, cardBuffer);
							if (!form.attachment) form.attachment = [];
							form.attachment.push(fs.createReadStream(filePath));
							// পাঠানোর পর delete
							setTimeout(() => fs.unlinkSync(filePath), 5000);
						}
					}
				} catch (e) {
					console.error("Card error:", e);
				}
				// ==============================

				message.send(form);
				delete global.temp.welcomeEvent[threadID];
			}, 1500);
		};
	}
};

// === Card তৈরি করার ফাংশন ===
async function makeWelcomeCard(userName, uid, boxName, memberCount) {
	try {
		const width = 1365, height = 600;
		const canvas = Canvas.createCanvas(width, height);
		const ctx = canvas.getContext("2d");

		// Background
		try {
			const bgImg = await Canvas.loadImage("https://i.imgur.com/rOiUKdi.jpeg");
			ctx.drawImage(bgImg, 0, 0, width, height);
		} catch {
			ctx.fillStyle = "#5565d6";
			ctx.fillRect(0, 0, width, height);
		}

		// Avatar
		let avatarImg = null;
		try {
			const res = await axios.get(
				`https://kaiz-apis.gleeze.com/api/facebookpfp?uid=${uid}&apikey=66e0cfbb-62b8-4829-90c7-c78cacc72ae2`,
				{ responseType: "arraybuffer", timeout: 8000 }
			);
			avatarImg = await Canvas.loadImage(Buffer.from(res.data));
		} catch { avatarImg = null; }

		const avatarSize = 220;
		const avatarX = width / 2;
		const avatarY = height * 0.33;

		ctx.save();
		ctx.beginPath();
		ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
		ctx.closePath();
		ctx.clip();
		if (avatarImg) ctx.drawImage(avatarImg, avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize);
		ctx.restore();

		// Text
		ctx.textAlign = "center";
		ctx.fillStyle = "#41E7FF";
		ctx.font = "bold 64px 'Segoe UI', Arial";
		ctx.fillText(userName, avatarX, avatarY + avatarSize / 2 + 70);

		ctx.fillStyle = "#fff";
		ctx.font = "600 36px 'Segoe UI', Arial";
		ctx.fillText(`Welcome to ${boxName}`, avatarX, avatarY + avatarSize / 2 + 120);

		ctx.font = "500 32px 'Segoe UI', Arial";
		ctx.fillText(`You're the ${memberCount} member`, avatarX, avatarY + avatarSize / 2 + 165);

		return canvas.toBuffer("image/png");
	} catch (err) {
		console.error("[makeWelcomeCard] error:", err);
		return null;
	}
}
