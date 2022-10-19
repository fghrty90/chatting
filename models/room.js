const mongoose = require('mongoose');

// Define Schemes
const roomSchema = new mongoose.Schema({
	nRoomCode	:	{ type: String, required: true }, // 방 id
	nMemberSeq	:	{ type: Number, required: true } // 회원 seq
},
{
	timestamps: true // 시간 저장 사용
});

// Create Model & Export
module.exports = mongoose.model('tRoom', roomSchema , 'tRoom');