"use strict"

const express = require('express');
const fs = require('fs');
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
app.get('/api/league-of-legends/v1/get_list', (req, res) => {
    const page = req.query.page,
        offset = 5;
    fs.readFile('./public/data.json', (err, data) => {
        if(err) {
            throw err;
        } else {
            const arr = JSON.parse(data.toString());
            const start = page*offset;
            const end = start + offset + 1;
            const data = arr.slice(start, end);
            res.json({ status: 200, data });
        }
    });
});

app.get('/api/league-of-legends/v1/get_comment', (req, res) => {
    const data = [{
        id: '0',
        name: '夜听雨',
        gender: 'man',
        level: '白金II',
        lastLogin: '4小时前',
        content: '又帮我徒弟上了个钻石，有想学小丑的可以加我QQ543064278 收徒不要钱的^_^'
    }, {
        id: '1',
        name: '烬夫人',
        gender: 'woman',
        level: '白银Ⅲ',
        lastLogin: '6小时前',
        content: '这两天迷上了剑圣，玉剑传说的皮肤是真的好看，不会打野，不会抓人，队友已经被我气到猝死！我觉得我还是挺厉害的。'
    }, {
        id: '2',
        name: '过客天邪',
        gender: 'man',
        level: '超凡大师',
        lastLogin: '8小时前',
        content: '跟大家说个事，我准备脱坑了，这个月31号！我将打上王者，没错是王者！立贴为誓'
    }];
    res.json({ status: 200, data });
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