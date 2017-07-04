import mongoose from 'mongoose';
import {slugify} from 'transliteration';

let categorySchema = new mongoose.Schema({
    name: { type: String },
    firstChar: { type: String },
    firstCharEng: { type: String },
    publicName: { type: String },
    order_count: { type: Number, default: 0 },
    lawyer_count: { type: Number, default: 0 },
    description: { type: String },
    rating: { type: Number, default: 0 }
}, { collection: 'categories' });

categorySchema.pre('save', function (next){
    let char = this.name[0].toLowerCase();
    let fCharEng = slugify(char);
    let fChar = char;
    this.name = fChar + this.name.slice(1);
    this.firstChar = fChar;
    this.firstCharEng = fCharEng;
    next();
});

module.exports = mongoose.model('Category', categorySchema);
