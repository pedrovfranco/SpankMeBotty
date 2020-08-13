const mongoose = require('mongoose');
const { Schema } = mongoose;

const inygonAnnounceListSchema = new Schema(
    {
        name: { type: String, required: true, unique: true },
    },
    {
        timestamps: false,
    },
);

module.exports = mongoose.model(
    'inygonAnnounceList',
    inygonAnnounceListSchema,
);