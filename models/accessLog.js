const mongoose = require('mongoose');

// Define Schemes
const accessLogSchema = new mongoose.Schema({
	nRoomCode			:	{ type: String, required: true }, // 방 ID
	nMemberSeq			:	{ type: Number, required: true }, // 회원 seq
	sMemberStatus		:	{ type: String, required: true }, // 회원 채팅 상태
	sSocketId			:	{ type: String, required: true }, // 소켓 ID
	sConnent			:	{ type: String, required: true }, // 접속 여부
	dtCreateDatetime	:	{ type: Date, default: Date.now } // 화면 노출 날짜 (* 몽고 디비는 입력 , 수정 날짜 저장이 됨 )
},
{
  timestamps: true // 시간 저장 사용
});

// 인덱스 설정
accessLogSchema.index({ nRoomCode: 1, nMemberSeq: 1 });
// Create Model & Export
module.exports = mongoose.model('tAccessLog', accessLogSchema ,'tAccessLog');