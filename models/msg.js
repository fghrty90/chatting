const mongoose = require('mongoose');

// Define Schemes
const msgSchema = new mongoose.Schema({
	nRoomCode			:	{ type: String, required: true }, // 방 이름
	nMemberSeq			:	{ type: Number, required: true }, // 회원 seq
	sContent			:	{ type: String, required: true }, // 내용
	sType				:	{ type: String, required: true }, // 메세지 타입
	sFileType			:	{ type: String, required: false }, // 이미지타입
	sFileOriginURL		:	{ type: String, required: false }, // 이미지 원본
	sReplyId			:	{ type: String, required: false }, // 답장 부모 ID
	sReplyType			:	{ type: String, required: false }, // 답장 부모 타입
	sReplyContent		:	{ type: String, required: false }, // 답장 부모 내용
	sReplyMemberSeq		:	{ type: Number, required: false }, // 답장 부모 회원 seq
	sLinkTitle			:	{ type: String, required: false }, // 링크 제목
	sLinkDescription	:	{ type: String, required: false }, // 링크 제목
	sLinkURL			:	{ type: String, required: false }, // 링크 주소
	sLinkIMAGE			:	{ type: String, required: false }, // 링크 이미지
	dtCreateDatetime	:	{ type: String, required: true } // 회면 노출 날짜 (* 몽고 디비는 입력 , 수정 날짜 저장이 됨 )
},
{
	timestamps: true // 시간 저장 사용
});
// 인덱스 설정
msgSchema.index({ nRoomCode: 1, nMemberSeq: 1 });
// Create Model & Export
module.exports = mongoose.model('tMsg', msgSchema , 'tMsg');