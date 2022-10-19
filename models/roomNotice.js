const mongoose = require('mongoose');

// Define Schemes
const roomNoticeSchema = new mongoose.Schema({
	nRoomCode	:	{ type: String, required: true }, // 방 id
	nMemberSeq	:	{ type: Number, required: true }, // 회원 seq
	sContent	:	{ type: String, required: true } // 공지 내용
},
{
	timestamps: true // 시간 저장 사용
});

// 인덱스 설정
roomNoticeSchema.index({ nRoomCode: 1, nMemberSeq: 1 });
// Create Model & Export
module.exports = mongoose.model('tRoomNotice', roomNoticeSchema , 'tRoomNotice');