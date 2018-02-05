"use strict";

const http = require('http');
const fs = require('fs');
const qs = require('querystring');

const users = new Map();
users.set('admin', {
    password: 'password',
    role: 'admin',
});

users.set('user1', {
    password: 'password2',
    role: 'user',
});

users.set('milosz', {
    password: 'nicepassword',
    role: 'user',
});

function getUserList(callback) {
    let userList = [];
    users.forEach((username, user) => {userList.push({username, role: user.role})});
    callback(userList);
}

function checkPassword(username, password, callback) {
    if(users.has(username))
        if(users.get(username).password === password)
            callback({status: 'ok', role: users.get(username).role});

    callback({status: 'wrong'});
}

function compareUrl(url1, url2){
    return (url1.slice(0, url2.length) === url2);
}

const server = http.createServer((req, res) => {
    console.log(req.headers.cookie);
    console.log(req.url);
    // console.log(req);
    if(compareUrl(req.url, '/login.html')) {
        res.end(fs.readFileSync('login.html').toString());
    }

    if (req.method === 'POST') {
        let body = '';

        req.on('data', (data) => {
            body += data;

            // Too much POST data, kill the connection!
            // 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
            if (body.length > 1e6)
                req.connection.destroy();
        });

        req.on('end', function () {
            const post = qs.parse(body);
            console.log(post);
            if(req.url === '/index.html') {
                checkPassword(post.username, post.password, (result) => {
                    if(result.status === 'ok') {
                        if(result.role === 'admin') {
                            res.end(fs.readFileSync('indexAdmin.html'));
                        }
                        else if(result.role === 'user') {
                            res.end(fs.readFileSync('indexUser.html'));
                        }
                    }
                    else {
                        res.writeHead(302, {
                            'Location': 'login.html?err=1'
                        });
                        res.end();
                    }
                })
            }
            // use post['blah'], etc.
        });
    }

}).listen(8881);

