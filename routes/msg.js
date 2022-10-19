var express = require('express'); //서버를 생성한다.
var router = express.Router(); // 라우터 분리

const tMsg = require('../models/msg'); //  메세지 모델
const tAccessLog = require('../models/accessLog'); // 접근 로그 모델
const tRoomNotice = require('../models/roomNotice'); // 접근 로그 모델

let result = {
	status : 200,
	data : [],
	desc: '',
	count: 0
}
function reset() {
	result.status = 200;
	result.data = [];
	result.desc = '';
	result.count = 0;
}
// 접근 로그 저장 및 조회 리턴
router.post('/checkAccessLog',function(req, res){
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	res.header("Access-Control-Allow-Methods", "POST");
	reset();
	if(req.body.nMemberSeq > 0 && req.body.nRoomCode != '') {
		// 접근 로그 조회
		tAccessLog.find(
		{
			nRoomCode: req.body.nRoomCode,
			nMemberSeq: req.body.nMemberSeq,
			sMemberStatus: req.body.sMemberStatus
		},
		function (err, alList) { 
			if (err){
				result.status = 500;
				result.desc = '데이터 조회 실패하였습니다.';
				return;
			} else {
				if(alList.length == 0) {
					result.status = 500;
					result.desc = '데이터 존재하지 않습니다.';
					return;
				} else {// 접근 로그 있는 겨우
				
					tAccessLog.find(
					{
						nRoomCode: req.body.nRoomCode,
						nMemberSeq: req.body.nMemberSeq,
						sMemberStatus: req.body.sMemberStatus
					},
					function (err, alList) { 
						if (err){ 
							result.status = 500;
							result.desc = '데이터 조회 실패 하였습니다.';
							res.json(result);
							return;
						} else {
							if(alList.length == 0) {
								result.desc = '데이터 존재하지 않습니다.';
								res.json(result);
								return;
							} else {// 접근 로그 있는 겨우
								tMsg.countDocuments(
									{
										createdAt: {
											$gt: alList[0].createdAt // 첫 로그 기록 이후 데이터 조회
										}
									}, function (err, count) {
										if (err){
											result.status = 500;
											result.desc = '데이터 존재하지 않습니다.';
											res.json(result);
											return;
										}else{
											result.data = alList;
											result.desc = '조회 성공';
											result.count = count;
											res.json(result);
											return;
										}
								});
							}
						}
					});
				}
			}
		});
	} else {
		result.status = 500;
		result.desc = '필수 값이 존재하지 않습니다.';
		res.json(result);
		return;
	}
});

// 공지 조회
router.get('/getNotice',function(req, res){
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	res.header("Access-Control-Allow-Methods", "GET");
	reset();
	if(req.query.nRoomCode > 0) {
		tRoomNotice.find(
		{
			nRoomCode: req.query.nRoomCode
		}, 
		null, // null이면 전체 필드 조회
		{ 
			limit: 1,
			skip: 0, 
			sort: {
				createdAt: -1 //Sort by Date Added DESC
			}
		},
		function (err, alList) { 
			if (err){ 
				result.status = 500;
				result.desc = '공지 조회 실패했습니다.';
			} else {
				if(alList.length == 0) {
					result.status = 200;
					result.desc = '데이터 존재하지 않습니다.';
				} else {// 접근 로그 있는 겨우
					result.data = alList;
				}
			}
			res.json(result);
			return;
		});
	} else {
		result.status = 500;
		result.desc = '필수 값이 존재하지 않습니다.';
		res.json(result);
		return;
	}
});

/*
동호회 단체방 이전 채팅 이력 조회
1. 최초 접근 로그가 있는 경우 해당 날짜 이후 대화 내역 조회
2. 접근 로그 없는 경우 접근 로그 저장
*/
router.get('/getBeforMsg',function(req, res){
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	res.header("Access-Control-Allow-Methods", "GET");
	reset();
	if(req.query.nRoomCode != '' && req.query.nMemberSeq > 0 && (req.query.accessLogDate != '' || req.query.sMsgID != '')) {
		let param = {
			nRoomCode: req.query.nRoomCode
		}
		
		if(typeof req.query.accessLogDate !== 'undefined' && req.query.accessLogDate != '') {
			param.createdAt = {
				$gt: req.query.accessLogDate // 첫 로그 기록 이후 데이터 조회
			}
		}
		
		if(typeof req.query.sType !== 'undefined' && req.query.sType != ''){
			param.sType = req.query.sType;
		}
		if(typeof req.query.sMsgID !== 'undefined' &&  req.query.sMsgID != ''){
			param._id = req.query.sMsgID;
		}
		
		if(req.query.nLimit =='' || req.query.nLimit == 0) req.query.nLimit = 50;
		if(req.query.nSkip =='' || req.query.nSkip == 0) req.query.nSkip = 0;
		
		tMsg.find(
		param, 
		null, // null이면 전체 필드 조회
		{ 
			limit: parseInt(req.query.nLimit),
			skip: parseInt(req.query.nSkip), 
			sort: {
				_id: -1 //Sort by Date Added DESC
			}
		},
		function (err, docs) {
			if (err) { 
				console.log(err);
				result.status = 500;
				result.desc = 'NO DATA';
			}
			else { // 있는 경우 json 리던
				result.data = docs;
				result.count = docs.length;
			} 
			res.json(result);
			return;
		});
	} 
	else {
		result.status = 500;
		result.desc = 'NO DATA';
		res.json(result);
		return;
	}
});



/*
동호회 단체방 채팅 삭제 (실제 적으로 내용 변경)
*/
router.post('/deleteMsg',function(req, res){
	reset();
	if(
		typeof req.query.sMsgID === 'undefined' ||  req.query.sMsgID == ''
	){
		result.status = 500;
		result.desc = 'no parameter';
		res.json(result);
		return;
	}
	try {
		// 내용 삭제로 변경
		tMsg.updateOne({_id:req.query.sMsgID}, 
	    {
			sContent:"삭제된 메시지입니다.",
			sType:"message",
		}, function (err, docs) {
		    if (err){
		        console.log(err)
				result.status = 500;
				result.desc = '업데이트 실패';
		    } else {
				result.data = docs;
				
				// 답변 내용이 있다면 삭제로 변경
				tMsg.updateOne({sReplyId:req.query.sMsgID}, 
			    {
					sReplyContent:"삭제된 메시지입니다.",
					sReplyType : 'message'
				}, function (err, docs) {
			    if (err){
			        console.log(err)
					result.status = 500;
					result.desc = '답변 업데이트 실패';
			    } else {
					result.data = docs;
			    }
					res.json(result);
					return;
		    	});
		
			}
		});
	} catch (error) {
		result.status = 500;
		result.desc = '시스템 오류';
		res.json(result);
		return;
	}
});

// Create Model & Export
module.exports = router;
