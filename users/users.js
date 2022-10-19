/**
 * 접속 회원 변수에 보관
 */

const tAccessLog = require('../models/accessLog'); // 접근 로그 모델

// 접속 회원 추가
const addUser = ({ sSocketId, nMemberSeq, nRoomCode, sMemberStatus}, callback) => {

	const user = { sSocketId, nMemberSeq, nRoomCode, sMemberStatus };
	
	tAccessLog.find(
	{
		nRoomCode: nRoomCode,
		nMemberSeq: nMemberSeq
	},
	function (err, alList) {
		if(alList.length == 0) {
			oAccessLog = new tAccessLog({
				nRoomCode		: nRoomCode,
				nMemberSeq		: nMemberSeq,
				sSocketId		: sSocketId,
				sMemberStatus	: sMemberStatus,
				sConnent		: 'Y'
			}).save(function(err,alsaveResult){
				if(err){
					return callback({ error: err });
				} else {
					getUsersInRoom(nRoomCode, function(response){
						callback({ data: response });
					});
				}
			});
		} else {
			tAccessLog.updateOne({
				nRoomCode		: nRoomCode,
				nMemberSeq		: nMemberSeq
			}, 
		    {
				sSocketId		: sSocketId,
				sConnent		: 'Y'
			}, function (err, docs) {
			    if (err){
			         return callback({ error: err });
			    } else {
					getUsersInRoom(nRoomCode, function(response){
						callback({ data: response });
					});
				}
	    	});
		}
	});
  return callback({ user });
}

// 나간 회원 삭제
const removeUser = (sSocketId , nRoomCode, nMemberSeq, callback) => {
	
	tAccessLog.updateOne({
		sSocketId	: sSocketId
	}, 
    {
		nMemberSeq		: nMemberSeq,
		sSocketId		: '',
		sConnent		: 'N'
	}, function (err, docs) {
	    if (err){
	         return { error: err };
	    } else {
			tAccessLog.find(
			{
				nRoomCode	: nRoomCode,
				sConnent	: 'Y'
			},
			function (err, userList) {
				if(!err) {
					return callback(userList);
				}
			}
			);
		}
	});
	
}

//대화방에 있는 회원 가져오기
const getUsersInRoom = (nRoomCode, callback) => {
	tAccessLog.find(
	{
		nRoomCode	: nRoomCode,
		sConnent	: 'Y'
	},
	function (err, userList) {
		if(!err) {
			return callback(userList);
		}
	}
	);
};

module.exports = { addUser, removeUser, getUsersInRoom };