import {Schema, model } from 'mongoose';

export interface IInygonAnnounceList {
	name: string
};

const inygonAnnounceListSchema = new Schema<IInygonAnnounceList>(
    {
        name: { type: String, required: true, unique: true },
    },
    {
        timestamps: false,
    },
);

export default model<IInygonAnnounceList>(
    'inygonAnnounceList',
    inygonAnnounceListSchema,
);