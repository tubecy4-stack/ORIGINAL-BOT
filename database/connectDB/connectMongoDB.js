module.exports = async function (uriConnect) {
        const mongoose = require("mongoose");

        const threadModel = require("../models/mongodb/thread.js");
        const userModel = require("../models/mongodb/user.js");
        const dashBoardModel = require("../models/mongodb/userDashBoard.js");
        const globalModel = require("../models/mongodb/global.js");

        await mongoose.connect(uriConnect, {
                useNewUrlParser: true,
                useUnifiedTopology: true
        });

        try {
                await userModel.collection.dropIndex('email_1');
                console.log('Dropped email_1 index from users collection');
        } catch (err) {
                if (err.code !== 27 && err.codeName !== 'IndexNotFound') {
                        console.log('Note: email_1 index not found or already dropped');
                }
        }

        return {
                threadModel,
                userModel,
                dashBoardModel,
                globalModel
        };
};
