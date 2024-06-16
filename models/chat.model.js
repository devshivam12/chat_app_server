import express from "express";
import mongoose, { Schema, model, Types } from "mongoose";

const schema = Schema(
    {
        name: {
            type: String,
            required: true
        },
        groupChat: {
            type: Boolean,
            default: false
        },
        creators: {
            type: Types.ObjectId,
            ref: "User"
        },
        members: [
            {
                type: Types.ObjectId,
                ref: "User"
            }
        ]
    },
    {
        timestamps: true
    }
)

export const Chat = mongoose.models.Chat || model("Chat", schema)