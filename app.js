"use strict"

const express = require('express');
let app = express();
let http = require('http').Server(app);
const io = require('socket.io')(http);
const _ = require('underscore');

// 保存所有在线用户的昵称
let users = [];


app.use('/', express.static(__dirname + '/public'));

// 测试网站并发接口
app.get('/test', (req, res) => {
    sleep(10000);
    res.json({ status: 200, msg: '延迟10秒请求成功' });
});

// 自定义数据接口
app.get('/league-of-legends/v1/get_list', (req, res) => {
    const data = [{
        title: '英雄谱：卢兮夜单杀Faker惊世人 把团队抗在肩上的少年',
        author: '腾讯体育',
        date: '04-19 10:50',
        num: '27.8',
        detail: '"夏季赛见"大概是这个春天，对于WE和WE粉丝而言，最难过但也最令人期待的四个字。'
    }, {
        title: 'BLG上单AJ深夜直播透露：RNG更强赢面更大！',
        author: '你好像很迷人',
        date: '04-19 11:50',
        num: '21.9',
        detail: '在这个星期四，IG对RNG的比赛是几乎所有loler都关注的焦点，强强对决即将上演，BLG战队的大腿上单AJ也在最近深夜的一次直播中发表了对这两个队伍的看法。'
    }, {
        title: '周董又开直播了，就在4月22日下午两点半！',
        author: '玩加赛事',
        date: '04-18 20:24',
        num: '19.3',
        detail: '在这个星期四，IG对RNG的比赛是几乎所有loler都关注的焦点，强强对决即将上演，BLG战队的大腿上单AJ也在最近深夜的一次直播中发表了对这两个队伍的看法。'
    }, {
        title: '德玛西亚皇子：死兆星超炫特效值得来一打',
        author: '游戏巡游者',
        date: '04-19 11:18',
        num: '10.8',
        detail: '在这个星期四，IG对RNG的比赛是几乎所有loler都关注的焦点，强强对决即将上演，BLG战队的大腿上单AJ也在最近深夜的一次直播中发表了对这两个队伍的看法。'
    }, {
        title: '常规赛MVPvs两千杀先生 谁将主导战局',
        author: '官方赛事中心',
        date: '04-19 12:00',
        num: '12.6',
        detail: '在这个星期四，IG对RNG的比赛是几乎所有loler都关注的焦点，强强对决即将上演，BLG战队的大腿上单AJ也在最近深夜的一次直播中发表了对这两个队伍的看法。'
    }, {
        title: '半决赛来临 选手们都在练习些什么英雄？',
        author: '玩加赛事',
        date: '04-18 11:40',
        num: '14.4',
        detail: '在这个星期四，IG对RNG的比赛是几乎所有loler都关注的焦点，强强对决即将上演，BLG战队的大腿上单AJ也在最近深夜的一次直播中发表了对这两个队伍的看法。'
    }];
});

// 处理ws连接
io.on('connection', (socket) => {
    socket.emit('initial', users);
    socket.on('login', (nickname) => {
        if (users.indexOf(nickname) > -1) {
            socket.emit('nickExisted');
        } else {
            socket.userIndex = users.length;
            socket.nickname = nickname;
            users.push(nickname);
            // 向当前连接发送事件
            socket.emit('loginSuccess');
            socket.join(nickname);
            // 向所有连接广播事件
            io.emit('system', nickname, users, 'login');
        }
    });
    // 断开连接事件
    socket.on('disconnect', () => {
        users.splice(socket.userIndex, 1);
        // 广播除了自己以外的所有人
        socket.broadcast.emit('system', socket.nickname, users, 'logout');
    });
    // 接收新消息
    socket.on('postMsg', (msg, color, another) => {
        if (another) {
            let toSocket = _.findWhere(io.sockets.sockets, { nickname: another });
            toSocket.emit('newMsg', socket.nickname, msg, color, 'one');
        } else {
            socket.broadcast.emit('newMsg', socket.nickname, msg, color, 'all');
        }
    });
    // 接收用户发来的图片
    socket.on('img', (imgData, another) => {
        if (another) {
            let toSocket = _.findWhere(io.sockets.sockets, { nickname: another });
            socket.broadcast.emit('newImg', socket.nickname, imgData, 'one');
        } else {
            socket.broadcast.emit('newImg', socket.nickname, imgData, 'all');
        }
    });
});


function sleep(n) {
    var start = new Date().getTime();
    while (true) if (new Date().getTime() - start > n) break;
}


http.listen(3121, () => {
    console.log('listening on *:3121');
});