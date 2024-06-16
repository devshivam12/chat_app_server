import jwt from "jsonwebtoken";
import { TryCatch } from "../middlewares/error.js";
import { Chat } from "../models/chat.model.js";
import { Message } from "../models/message.model.js";
import { User } from "../models/user.model.js";
import { ErrorHandler } from "../utils/utility.js";
import { cookieOption } from '../utils/feature.js'
import { adminSecretKey } from "../app.js";

const adminLogin = TryCatch(async (req, res, next) => {
    const { secretKey } = req.body;

    const isMatched = secretKey === adminSecretKey;

    if (!isMatched) return next(new ErrorHandler("Invalid Admin Key", 401));

    const token = jwt.sign(secretKey, process.env.JWT_SECRET);

    return res.status(200).cookie("chattenger-admin-token", token, {
        ...cookieOption,
        maxAge: 1000 * 60 * 20
    }).json({
        success : true,
        message : "Authenticated Successfully, Welcome Brother",
    })
})

const adminLogout = TryCatch(async(req,res,next) => {
    return res.status(200).cookie("chattenger-admin-token", "", {
        ...cookieOption,
        maxAge: 0
    }).json({
        success : true,
        message : "Logout successfully",
    })
})


const getAdminData = TryCatch(async(req,res,next)=> {
    return res.status(200).json({
        admin : true
    })
})



const allUsers = TryCatch(async (req, res) => {
    const users = await User.find({});

    const transformUsers = await Promise.all(
        users.map(async ({ name, username, avatar, _id }) => {
            const [groups, friends] = await Promise.all([
                Chat.countDocuments({ groupChat: true, members: _id }),
                Chat.countDocuments({ groupChat: false, members: _id }),
            ]);

            return {
                name,
                username,
                avatar: avatar.url,
                _id,
                groups,
                friends
            };
        })
    );

    return res.status(200).json({
        statsu: "success",
        users: transformUsers
    })
})


const allChats = TryCatch(async (req, res) => {
    const chats = await Chat.find({}).populate("members", "name avatar").populate("creators", "name avatar");

    const transformChats = await Promise.all(
        chats.map(async ({ members, _id, groupChat, name, creators }) => {
            const totalMessages = await Message.countDocuments({ chat: _id });

            return {
                _id,
                groupChat,
                name,
                avatar: members.slice(0, 3).map((member) => member.avatar.url),
                members: members.map(({ _id, name, avatar }) => ({
                    _id,
                    name,
                    avatar: avatar.url,
                })),
                creators: {
                    name: creators?.name || "None",
                    avatar: creators?.avatar.url || "",
                },
                totalMembers: members.length,
                totalMessages,
            };
        })
    );

    return res.status(200).json({
        status: "success",
        chats: transformChats
    })
});


const allMessages = TryCatch(async (req, res) => {
    const messages = await Message.find({}).populate("sender", "name avatar").populate("chat", "groupChat");

    const transformedMessages = messages.map(
        ({ content, attachements, _id, sender, createdAt, chat }) => ({
            _id,
            attachements,
            content,
            createdAt,
            chat: chat._id,
            groupChat: chat.groupChat,
            sender: {
                _id: sender._id,
                name: sender.name,
                avatar: sender.avatar.url,
            },
        })
    );

    return res.status(200).json({
        success: true,
        messages: transformedMessages
    })
})



const getDashboardStats = TryCatch(async (req, res) => {
    const [groupCount, usersCount, messagesCount, totalChatsCount] = await Promise.all([
        Chat.countDocuments({ groupChat: true }),
        User.countDocuments(),
        Message.countDocuments(),
        Chat.countDocuments(),
    ]);

    const today = new Date();

    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const last7DaysMessages = await Message.find({
        createdAt: {
            $gte: last7Days,
            $lte: today
        },
    }).select("createdAt")

    const messages = new Array(7).fill(0);
    const dayInMilliseconds = 1000 * 60 * 60 * 24;

    last7DaysMessages.forEach((message) => {
        const indexApprox =
            (today.getTime() - message.createdAt.getTime()) / dayInMilliseconds;

        const index = Math.floor(indexApprox)

        messages[6 - index]++;

    });

    const stats = {
        groupCount,
        usersCount,
        messagesCount,
        totalChatsCount,
        messagesChart: messages,
    };

    return res.status(200).json({
        success: true,
        stats
    })
})


export { 
    allUsers, 
    allChats, 
    allMessages, 
    getDashboardStats,
    getAdminData,
    adminLogin,
    adminLogout
}