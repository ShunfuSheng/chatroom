"use strict"

window.onload = function() {
    var hichat = new HiChat();
    hichat.init();
    // 私聊功能
    $('body').on('click', '.list-item', function() {
        $('.list-group li').removeClass('selected');
        $(this).closest('li').addClass('selected');
        // 删除消息提醒
        $(this).prev('span').remove();
        var roomId = $(this).text();
        $('#status').html('正在和 <span>' + roomId + '</span> 聊天');
        var index = $(this).parent().data('id');
        $('.historyMsg').hide();
        $('.historyMsg[data-id="' + index + '"]').show();
    });
    // 群聊功能
    $('body').on('click', '#chat-to-all', function() {
        $('.list-group li').removeClass('selected');
        $(this).closest('li').addClass('selected');
        // 删除消息提醒
        $(this).prev('span').remove();
        var count = $('.list-item').length + 1;
        $('#status').html(count + ' 人在线');
        $('.historyMsg').hide();
        $('.historyMsg').eq(0).show();
    });
};


// 定义hichat类
var HiChat = function() {
    this.socket = null;
};

// 添加原型方法
HiChat.prototype = {
    init: function() {
        var that = this;
        // 建立到服务器的socket连接
        this.socket = io.connect();
        // 监听socket的connect事件，此事件表示连接已经建立
        this.socket.on('connect', function() {
            // 连接到服务器后，显示昵称输入框
            document.getElementById('info').textContent = '请输入你的昵称（随便写）:)';
            document.getElementById('nickWrapper').style.display = 'block';
            document.getElementById('nicknameInput').focus();
            document.getElementById('loginBtn').addEventListener('click', function() {
                var nickName = document.getElementById('nicknameInput').value;
                if(nickName.trim().length != 0) {
                    that.socket.emit('login', nickName);
                }else {
                    document.getElementById('nicknameInput').focus();
                }
            }, false);
        });
        // 初始化在线列表和聊天板
        this.socket.on('initial', function(users) {
            var listStr = '<li class="list-group-item selected" data-id="0"><a href="javascript:;" id="chat-to-all">群聊</a></li>';
            var boardStr = '<div class="historyMsg" data-id="0"></div>';
            users.forEach(function(item, index) {
                    listStr += `<li class="list-group-item" data-id="${index+1}"><a class="list-item" href="javascript:;">${item}</a></li>`;
                    boardStr += `<div class="historyMsg" data-id="${index+1}" style="display: none;"></div>`;
            });
            $('.list-group').html(listStr);
            $('.board-group').html(boardStr);
        });
        // 当昵称已存在的情况下
        this.socket.on('nickExisted', function() {
            document.getElementById('info').textContent = '昵称已存在，请重新输入！';
        });
        // 登录成功的情况下
        this.socket.on('loginSuccess', function() {
            document.title = '聊天室 | ' + document.getElementById('nicknameInput').value;
            document.getElementById('loginWrapper').style.display = 'none';
            document.getElementById('messageInput').focus();
        });
        // 系统消息展示
        this.socket.on('system', function(nickName, users, type) {
            var msg = nickName + (type == 'login' ? ' 加入了聊天室' : ' 离开了');
            that._displayNewMsg('message', 'system', msg, 'red');
            document.getElementById('status').textContent = users.length + ' 人在线';
            // 在线列表追加一人
            if(type == 'login') {
                if(nickName !== $('#nicknameInput').val()) {
                    $('.list-group').append(`<li class="list-group-item" data-id="${users.length}"><a class="list-item" href="javascript:;">${nickName}</a></li>`);
                    $('.board-group').append(`<div class="historyMsg" data-id="${users.length}" style="display: none;"></div>`);
                }
            }else {
                // 在线列表删除一人
                var index = $(`.list-group li:contains("${nickName}")`).data('id');
                if($(`.list-group li[data-id="${index}"]`).hasClass('selected')) {
                    $('.list-group li').eq(0).addClass('selected');
                    $('.historyMsg').eq(0).show();
                }
                $(`.list-group li[data-id="${index}"]`).remove();
                $(`.historyMsg[data-id="${index}"]`).remove();
            }
        });
        // 发消息
        document.getElementById('sendBtn').addEventListener('click', function() {
            var messageInput = document.getElementById('messageInput'),
                msg = messageInput.value,
                // 获取颜色值
                color = document.getElementById('colorStyle').value;
            messageInput.value = '';
            messageInput.focus();
            if(msg.trim().length != 0) {
                that.socket.emit('postMsg', msg, color);
                that._displayNewMsg('message', 'me', msg, color);
            }
        }, false);
        // 接收聊天消息并显示到面板
        this.socket.on('newMsg', function(user, msg, color, type) {
            // 消息提醒
            var target = type == 'one' ? $(`.list-group li:contains("${user}")`) : $('.list-group li').eq(0);
            if(!target.hasClass('selected') && !target.find('span.badge')[0]) {
                target.prepend('<span class="badge">1</span>');
            }
            // 存储历史消息并展示
            that._displayNewMsg('message', user, msg, color, type);
        });
        // 发送图片功能
        document.getElementById('sendImage').addEventListener('change', function() {
            if(this.files.length != 0) {
                var file = this.files[0],
                    reader = new FileReader();
                if(!reader) {
                    that._displayNewMsg('message', 'system', '!your browser doesn\'t support fileReader', 'red');
                    this.value = '';
                    return;
                }
                reader.onload = function(e) {
                    this.value = '';
                    var friend;
                    if(friend = $('#status span').text()) {
                        that.socket.emit('img', e.target.result, friend);
                    }else {
                        that.socket.emit('img', e.target.result);
                    }
                    that._displayNewMsg('image', 'me', e.target.result);
                }
                reader.readAsDataURL(file);
            }
        }, false);
        // 接收用户所发图片
        this.socket.on('newImg', function(user, img, type) {
            // 消息提醒
            var target = type == 'one' ? $(`.list-group li:contains("${user}")`) : $('.list-group li').eq(0);
            if(!target.hasClass('selected') && !target.find('span.badge')[0]) {
                target.prepend('<span class="badge">1</span>');
            }
            that._displayNewMsg('image', user, img, '#000', type);
        });
        // 初始化表情包
        this._initialEmoji();
        document.getElementById('emoji').addEventListener('click', function(e) {
            var emojiwrapper = document.getElementById('emojiWrapper');
            emojiwrapper.style.display = 'block';
            e.stopPropagation();
        }, false);
        document.body.addEventListener('click', function(e) {
            var emojiwrapper = document.getElementById('emojiWrapper');
            if(e.target != emojiwrapper) {
                emojiwrapper.style.display = 'none';
            }
        });
        document.getElementById('emojiWrapper').addEventListener('click', function(e) {
            var target = e.target;
            if(target.nodeName.toLowerCase() == 'img') {
                var messageInput = document.getElementById('messageInput');
                messageInput.focus();
                messageInput.value = messageInput.value + '[emoji:' + target.title + ']';
            }
        }, false);
        // Enter按键功能
        document.getElementById('nicknameInput').addEventListener('keyup', function(e) {
            if (e.keyCode == 13) {
                var nickName = document.getElementById('nicknameInput').value;
                if (nickName.trim().length != 0) {
                    that.socket.emit('login', nickName);
                };
            };
        }, false);
        document.getElementById('messageInput').addEventListener('keyup', function(e) {
            var messageInput = document.getElementById('messageInput'),
                msg = messageInput.value,
                color = document.getElementById('colorStyle').value;
            if (e.keyCode == 13 && msg.trim().length != 0) {
                messageInput.value = '';
                var friend;
                if(friend = $('#status span').text()) {
                    that.socket.emit('postMsg', msg, color, friend);
                }else {
                    that.socket.emit('postMsg', msg, color);
                }
                that._displayNewMsg('message', 'me', msg, color);
            };
        }, false);
    },
    _displayNewMsg: function(kind, user, msg, color, type) {
        var container;
        if(user == 'system' || user == 'me') {
            container = $('.historyMsg:visible')[0];
        }else if(type && type == 'all') {
            container = $('.historyMsg')[0];
        }else {
            var index = $(`.list-group li:contains("${user}")`).data('id');
            container = $(`.historyMsg[data-id="${index}"]`)[0];
        }
        var msgToDisplay = document.createElement('p'),
            date = new Date().toTimeString().substr(0, 8);
        if(kind == 'message') {
            var msg = this._showEmoji(msg);
            msgToDisplay.style.color = color || '#000';
            if(user == 'me') {
                msgToDisplay.style.textAlign = 'right';
                msgToDisplay.innerHTML = `${msg}<span class="timespan">(${date}): </span><i class="glyphicon glyphicon-piggy-bank"></i>`;
            }else {
                msgToDisplay.innerHTML = `${user}<span class="timespan">(${date}): </span>${msg}`;
            }
        }else if(kind == 'image') {
            if(user == 'me') {
                msgToDisplay.style.textAlign = 'right';
                msgToDisplay.innerHTML = `<span class="timespan">(${date}): </span><i class="glyphicon glyphicon-piggy-bank"></i><br><img src="${msg}">`;
            }else {
                msgToDisplay.innerHTML = `${user}<span class="timespan">(${date}): </span><br><img src="${msg}">`;
            }
        }
        container.appendChild(msgToDisplay);
        container.scrollTop = container.scrollHeight;
    },
    _initialEmoji: function() {
        var emojiContainer = document.getElementById('emojiWrapper'),
            docFragment = document.createDocumentFragment();
        for(var i=69; i>0; i--) {
            var emojiItem = document.createElement('img');
            emojiItem.src = '../content/emoji/' + i + '.gif';
            emojiItem.title = i;
            docFragment.appendChild(emojiItem);
        }
        emojiContainer.appendChild(docFragment);
    },
    _showEmoji: function(msg) {
        var match, result = msg,
            reg = /\[emoji:\d+\]/g,
            emojiIndex,
            totalEmojiNum = document.getElementById('emojiWrapper').children.length;
        while(match = reg.exec(msg)) {
            emojiIndex = match[0].slice(7, -1);
            if(emojiIndex > totalEmojiNum) {
                result = result.replace(match[0], '[X]');
            }else {
                result = result.replace(match[0], '<img class="emoji" src="../content/emoji/' + emojiIndex + '.gif">');
            }
        }
        return result;
    }
};