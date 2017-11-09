"use strict"

const express = require('express');
let app = express();
let http = require('http').Server(app);
const io = require('socket.io')(http);
const _ = require('underscore');

// 保存所有在线用户的昵称
let users = [];


app.use('/', express.static(__dirname + '/public'));

app.get('/test', (req, res)=> {
    console.log(req.query);
    res.json({status: 200, msg: '请求成功'});
});

// 处理ws连接
io.on('connection', (socket)=> {
    socket.emit('initial', users);
    socket.on('login', (nickname)=> {
        if(users.indexOf(nickname) > -1) {
            socket.emit('nickExisted');
        }else {
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
    socket.on('disconnect', ()=> {
        users.splice(socket.userIndex, 1);
        // 广播除了自己以外的所有人
        socket.broadcast.emit('system', socket.nickname, users, 'logout');
    });
    // 接收新消息
    socket.on('postMsg', (msg, color, another)=> {
        if(another) {
            let toSocket = _.findWhere(io.sockets.sockets, {nickname: another});
            toSocket.emit('newMsg', socket.nickname, msg, color, 'one');
        }else {
            socket.broadcast.emit('newMsg', socket.nickname, msg, color, 'all');
        }
    });
    // 接收用户发来的图片
    socket.on('img', (imgData, another)=> {
        if(another) {
            let toSocket = _.findWhere(io.sockets.sockets, {nickname: another});
            socket.broadcast.emit('newImg', socket.nickname, imgData, 'one');
        }else {
            socket.broadcast.emit('newImg', socket.nickname, imgData, 'all');
        }
    });
});


http.listen(3121, ()=> {
    console.log('listening on *:3000');
});