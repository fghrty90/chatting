const cluster = require("cluster");
const http = require("http");
const https = require("https");
const fs = require("fs");
const express = require("express");
const redisAdapter = require("socket.io-redis");
const redis = require("redis");

/* express 객체 생성 */
const app = express();

let fullchain = "";
let privateKey = "";
let certificate = "";

// 로컬
try {
    if (process.env.DEV_ADOPTED_ENV == "DEVELOPER_PC") {
        privateKey = fs.readFileSync("../../openssl/private.pem");
        certificate = fs.readFileSync("../../openssl/public.pem");
    } else {
        fullchain = fs.readFileSync(
            "/etc/letsencrypt/live/kluboapp.com/fullchain.pem"
        );
        privateKey = fs.readFileSync(
            "/etc/letsencrypt/live/kluboapp.com/privkey.pem"
        );
        certificate = fs.readFileSync(
            "/etc/letsencrypt/live/kluboapp.com/cert.pem"
        );
    }
} catch (error) {
    console.log(error);
}

const options = {
    ca: fullchain,
    key: privateKey,
    cert: certificate,
};

/* express https 서버 생성 */
const httpsServer = https.createServer(options, app);

/* express http 서버 생성 */
const httpServer = http.createServer(app);

const io = require("socket.io")(httpServer, {
    path: "/socket.io", // 클라이언트 사이드 코드의 path와 동일해야 한다.
    transports: ["websocket"], // websocket만을 사용하도록 설정
});

io.attach(httpServer, {
    pingInterval: 120000,
    pingTimeout: 60000,
    cookie: false,
});

io.attach(httpsServer, {
    pingInterval: 120000,
    pingTimeout: 60000,
    cookie: false,
});

const bodyParser = require("body-parser"); // 모듈 import. Express v4.16.0이상은 생략 가능

app.use(bodyParser.json()); // json 등록
app.use(bodyParser.urlencoded({ extended: false })); // URL-encoded 등록

let mongodb_url = ""; // 몽고 DB url
let redis_url = ""; // 레디스 DB url
let redis_pw = ""; // 레디스 DB pw
let redis_port = 6379; // 레디스 DB pw

if (process.env.DEV_ADOPTED_ENV == "DEVELOPER_PC") {
    mongodb_url = ""; // 몽고 DB url
    redis_url = "127.0.0.1";
} else {
    mongodb_url = ""; // 몽고 DB url
    redis_url = "127.0.0.1";
    redis_pw = "";
}

const mongoose = require("mongoose"); // 몽고 DB 생성
mongoose
    .connect(mongodb_url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true,
        useFindAndModify: false,
    })
    .then(() => console.log("Successfully connected to mongodb!"))
    .catch((e) => console.error(e));

const tMsg = require("./models/msg"); // 메세지 모델
const tRoomNotice = require("./models/roomNotice"); // 공지 모델

// 접속 회원
const { addUser, removeUser, getUsersInRoom } = require("./users/users.js");

//메세지 관련 rouster
const rouster = require("./routes/msg.js");
app.use(rouster);

const pub = redis.createClient(redis_port, redis_url, { auth_pass: redis_pw });
const sub = redis.createClient(redis_port, redis_url, { auth_pass: redis_pw });

// 클러스터 어댑터 사용
io.adapter(redisAdapter({ pubClient: pub, subClient: sub }));

/*io.adapter(redisAdapter({
	host: redis_url,
	port: 6379
}));*/

// socket connection 및 socket 관련 함수
io.on("connection", function (socket) {
    //console.log('client connected ..'+socket.id+'..cluster'+cluster.worker.id);
    // Join Room
    socket.on("join:room", function (data) {
        /* 소켓에 동호회 코드 및 회원코드 저장 */
        socket.nRoomCode = data.nRoomCode;
        socket.nMemberSeq = data.nMemberSeq;

        addUser(
            {
                sSocketId: socket.id,
                nMemberSeq: data.nMemberSeq,
                nRoomCode: data.nRoomCode,
                sMemberStatus: data.sMemberStatus,
            },
            function (userResult) {
                if (!userResult.error) {
                    if (typeof userResult.data != "undefined") {
                        io.to(data.nRoomCode).emit("roomData", {
                            nRoomCode: data.nRoomCode,
                            users: userResult.data,
                        });
                    }
                }
            }
        );
        socket.join(data.nRoomCode);
    });

    // 새로운 회원 접속
    socket.on("newUser", function (data) {
        var aData = new Date().toLocaleTimeString().split(/:| /); // 0 : (오전/오후) , 1 : 시간 , 2 : 분 , 3 : 초
        data.dtCreateDatetime = aData[0] + " " + aData[1] + ":" + aData[2];
        data.sType = "newUser";
        var oMsg = new tMsg({
            nRoomCode: data.nRoomCode,
            nMemberSeq: data.nMemberSeq,
            sContent: data.sType,
            sType: data.sType,
            sFileType: "",
            sFileOriginURL: "",
            dtCreateDatetime: data.dtCreateDatetime,
        });

        oMsg.save(function (err, result) {
            if (err) {
                console.log(err);
            } else {
            }
        });
        var returnData = [];
        returnData.push(data);
        /* 모든 소켓에게 전송 */
        socket.broadcast.to(data.nRoomCode).emit("update", returnData);
    });

    /* 유저에게 메시지 전송 */
    socket.on("newMessage", function (data) {
        // data.type = 'message'; // 메세지 타임
        // 화면 노출을 위한 시간
        var aData = new Date().toLocaleTimeString().split(/:| /); // 0 : (오전/오후) , 1 : 시간 , 2 : 분 , 3 : 초
        data.dtCreateDatetime = aData[0] + " " + aData[1] + ":" + aData[2];
        // 메세지 객체
        var oMsg = new tMsg({
            nRoomCode: data.nRoomCode,
            nMemberSeq: data.nMemberSeq,
            sContent: data.sContent,
            sType: data.sType,
            sFileType: "",
            sFileOriginURL: "",
            sReplyId: data.sReplyId,
            sReplyType: data.sReplyType,
            sReplyContent: data.sReplyContent,
            sReplyMemberSeq: data.sReplyMemberSeq,
            dtCreateDatetime: data.dtCreateDatetime,
        });
        //메세지 저장
        oMsg.save(function (err, result) {
            if (err) {
                console.log(err);
            } else {
                tMsg.find(
                    {
                        _id: result._id,
                    },
                    null,
                    {
                        limit: 1,
                        skip: 0,
                    },
                    function (err, docs) {
                        if (err) {
                            console.log(err);
                        } else {
                            // 있는 경우 json 리던
                            io.to(data.nRoomCode).emit("sendMessage", docs);
                        }
                    }
                );
            }
        });
    });

    socket.on("file", function (data) {
        try {
            var aData = new Date().toLocaleTimeString().split(/:| /); // 0 : (오전/오후) , 1 : 시간 , 2 : 분 , 3 : 초
            data.dtCreateDatetime = aData[0] + " " + aData[1] + ":" + aData[2];

            var oMsg = new tMsg({
                nRoomCode: data.nRoomCode,
                nMemberSeq: data.nMemberSeq,
                sContent: "file",
                sType: data.sType,
                sFileType: data.sFileType,
                sFileOriginURL: data.sFileOriginURL,
                dtCreateDatetime: data.dtCreateDatetime,
            });
            //메세지 저장
            oMsg.save(function (err, result) {
                if (err) {
                    console.log(err);
                } else {
                    tMsg.find(
                        {
                            _id: result._id,
                        },
                        null,
                        {
                            limit: 1,
                            skip: 0,
                        },
                        function (err, docs) {
                            if (err) {
                                console.log(err);
                            } else {
                                // 있는 경우 json 리던
                                io.to(data.nRoomCode).emit("sendMessage", docs);
                            }
                        }
                    );
                }
            });
        } catch (error) {
            console.log(error);
        }
    });

    socket.on("notice", function (data) {
        var aData = new Date().toLocaleTimeString().split(/:| /); // 0 : (오전/오후) , 1 : 시간 , 2 : 분 , 3 : 초
        data.dtCreateDatetime = aData[0] + " " + aData[1] + ":" + aData[2];

        var oRoomNotice = new tRoomNotice({
            nRoomCode: data.nRoomCode,
            nMemberSeq: data.nMemberSeq,
            sContent: data.sContent,
            dtCreateDatetime: data.dtCreateDatetime,
        });

        //메세지 저장
        oRoomNotice.save(function (err, result) {
            if (err) {
                console.log(err);
            } else {
                //접속 인원 조회
                io.to(data.nRoomCode).emit("noticeUpdate", result);
            }
        });
    });

    socket.on("linkMsgSave", function (data) {
        tMsg.updateOne(
            {
                _id: data.sMsgID,
            },
            {
                sLinkTitle: data.title,
                sLinkDescription: data.sLinkDescription,
                sLinkURL: data.url,
                sLinkIMAGE: data.image,
            },
            function (err, docs) {
                if (err) {
                    console.log(err);
                }
            }
        );
    });

    socket.on("deleteMsg", function (data) {
        //접속 인원 조회

        // MSG ID 전달
        io.to(data.nRoomCode).emit("deleteMsg", data);
    });

    /* 방 나가기 추후 회원 탈퇴 시 사용	*/
    socket.on("leave", function () {
        removeUser(
            socket.id,
            socket.nRoomCode,
            socket.nMemberSeq,
            function (response) {
                io.to(socket.nRoomCode).emit("roomData", {
                    nRoomCode: socket.nRoomCode,
                    users: response,
                });
            }
        );
        socket.leave(socket.nRoomCode); // 그룹 떠나기
    });

    // 접속 끊기
    socket.on("disconnect", function () {
        removeUser(
            socket.id,
            socket.nRoomCode,
            socket.nMemberSeq,
            function (response) {
                io.to(socket.nRoomCode).emit("roomData", {
                    nRoomCode: socket.nRoomCode,
                    users: response,
                });
            }
        );
        socket.emit("user:disconnect");
    });
});

/* 서버를 5600 포트로 listen */
httpServer.listen(5600, function () {
    console.log("HTTP server listening on port " + 5600);
});

try {
    httpsServer.listen(5601, function () {
        console.log("HTTPS server listening on port " + 5601);
    });
} catch (error) {
    console.log(error);
}
