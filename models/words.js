const mongoose = require('mongoose');

var WordSchema = mongoose.Schema({
    id: {
        type: Number,
        index: true,
    },
    word: {
        type: String,
    },
    article: {
        type: String
    },
})

var Word = module.exports = mongoose.model('Word', WordSchema)