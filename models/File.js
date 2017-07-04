import mongoose from 'mongoose';


let fileSchema = new mongoose.Schema({
    container: String,
    name: String,
    ext: { type: String },
    size: { type: Number },
    original: String,
    path: String,
    temp: { type: Boolean, default: false },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    crop: { type: String }
});


module.exports = mongoose.model('File', fileSchema);
