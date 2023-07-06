import {Schema, model } from 'mongoose';

interface ISoundBite {
    name: string,
    guildId: string,
    data: Buffer,
    extension: string,
    creator: string,
}

const soundBiteSchema = new Schema<ISoundBite>(
    {
        name: { type: String, required: true },
        guildId: { type: String, required: true },
        data: { type: Buffer, required: true },
        extension: { type: String, required: true },
        creator: { type: String, required: true },
    },
    {
        timestamps: true,
    },
);

// The Primary Key for a sound bite should be the {name, guildId} pair
soundBiteSchema.index({guildId: 1, name: 1}, {unique: true});

export default model<ISoundBite>(
    'soundBite',
    soundBiteSchema,
);