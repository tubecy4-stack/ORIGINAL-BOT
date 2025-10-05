const { getTime, drive } = global.utils;
const Canvas = require("canvas");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

if (!global.temp.leaveEvent)
	global.temp.leaveEvent = {};

module.exports = {
	config: {
		name: "leave",
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
			defaultLeaveMessage: `Goodbye {userName}.\nWe’ll miss {multiple} from {boxName}\nHave a peaceful {session} 😢`,
			multiple1: "you",
			multiple2: "you all"
		}
	},

	onStart: async ({ threadsData, message, event, api, getLang }) => {
		// === Trigger only when someone leaves ===
		if (event.logMessageType != "log:unsubscribe") return;
		return async function () {
			const hours = getTime("HH");
			const { threadID } = event;

			const leftParticipants = event.logMessageData.leftParticipantFbId
				? [{ userFbId: event.logMessageData.leftParticipantFbId }]
				: event.logMessageData.removedParticipants || [];

			if (!leftParticipants.length) return;

			if (!global.temp.leaveEvent[threadID])
				global.temp.leaveEvent[threadID] = {
					leaveTimeout: null,
					leftParticipants: []
				};

			global.temp.leaveEvent[threadID].leftParticipants.push(...leftParticipants);
			clearTimeout(global.temp.leaveEvent[threadID].leaveTimeout);

			global.temp.leaveEvent[threadID].leaveTimeout = setTimeout(async function () {
				const threadData = await threadsData.get(threadID);
				if (threadData.settings.sendLeaveMessage == false) return;

				const leftParticipants = global.temp.leaveEvent[threadID].leftParticipants;
				const threadName = threadData.threadName;
				const userName = [], mentions = [];
				let multiple = false;

				if (leftParticipants.length > 1) multiple = true;

				for (const user of leftParticipants) {
					try {
						const info = await api.getUserInfo(user.userFbId);
						const name = info[user.userFbId]?.name || "Unknown User";
						userName.push(name);
						mentions.push({ tag: name, id: user.userFbId });
					} catch {
						userName.push("Unknown User");
					}
				}

				if (userName.length == 0) return;

				let { leaveMessage = getLang("defaultLeaveMessage") } = threadData.data;
				const form = { mentions: leaveMessage.match(/\{userNameTag\}/g) ? mentions : null };

				leaveMessage = leaveMessage
					.replace(/\{userName\}|\{userNameTag\}/g, userName.join(", "))
					.replace(/\{boxName\}|\{threadName\}/g, threadName)
					.replace(/\{multiple\}/g, multiple ? getLang("multiple2") : getLang("multiple1"))
					.replace(
						/\{session\}/g,
						hours <= 10
							? getLang("session1")
							: hours <= 12
							? getLang("session2")
							: hours <= 18
							? getLang("session3")
							: getLang("session4")
					);

				form.body = leaveMessage;

				// === Custom attachments ===
				if (threadData.data.leaveAttachment) {
					const files = threadData.data.leaveAttachment;
					const attachments = files.reduce((acc, file) => {
						acc.push(drive.getFile(file, "stream"));
						return acc;
					}, []);
					form.attachment = (await Promise.allSettled(attachments))
						.filter(({ status }) => status == "fulfilled")
						.map(({ value }) => value);
				}

				// === Leave Card ===
				try {
					for (const user of leftParticipants) {
						const memberCount = (await api.getThreadInfo(threadID)).participantIDs.length;
						const cardBuffer = await makeLeaveCard(userName.join(", "), threadName, memberCount);
						if (cardBuffer) {
							const filePath = path.join(__dirname, `leave_${user.userFbId}.png`);
							fs.writeFileSync(filePath, cardBuffer);
							if (!form.attachment) form.attachment = [];
							form.attachment.push(fs.createReadStream(filePath));
							setTimeout(() => fs.unlinkSync(filePath), 5000);
						}
					}
				} catch (e) {
					console.error("Card error:", e);
				}
				// ==============================

				message.send(form);
				delete global.temp.leaveEvent[threadID];
			}, 1500);
		};
	}
};

// === Card তৈরি করার ফাংশন ===
async function makeLeaveCard(userName, boxName, memberCount) {
	try {
		const width = 1365, height = 600;
		const canvas = Canvas.createCanvas(width, height);
		const ctx = canvas.getContext("2d");

		// Background
		try {
			const bgImg = await Canvas.loadImage("https://i.imgur.com/9yVgB4f.jpeg"); // leave background
			ctx.drawImage(bgImg, 0, 0, width, height);
		} catch {
			ctx.fillStyle = "#2C2F33";
			ctx.fillRect(0, 0, width, height);
		}

		// Text
		ctx.textAlign = "center";
		ctx.fillStyle = "#FF6B6B";
		ctx.font = "bold 72px 'Segoe UI', Arial";
		ctx.fillText("Goodbye!", width / 2, height * 0.35);

		ctx.fillStyle = "#FFFFFF";
		ctx.font = "bold 56px 'Segoe UI', Arial";
		ctx.fillText(userName, width / 2, height * 0.5);

		ctx.fillStyle = "#B0B0B0";
		ctx.font = "500 36px 'Segoe UI', Arial";
		ctx.fillText(`from ${boxName}`, width / 2, height * 0.58);

		ctx.fillStyle = "#FFD700";
		ctx.font = "500 32px 'Segoe UI', Arial";
		ctx.fillText(`Now ${memberCount} members remain`, width / 2, height * 0.66);

		return canvas.toBuffer("image/png");
	} catch (err) {
		console.error("[makeLeaveCard] error:", err);
		return null;
	}
}
