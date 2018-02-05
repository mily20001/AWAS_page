"use strict";

const http = require('http');
const fs = require('fs');
const qs = require('querystring');
const crypto = require("crypto");

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

const validCookies = {};

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

function parseCookies(cookieString) {
    const cookies = [];
    cookieString && cookieString.split(';').forEach((cookie) => {
        const cookieParts = cookie.split('=');
        cookies[cookieParts.shift().trim()] = decodeURI(cookieParts.join('='));
    });

    return cookies;
}

function cookieToUser(cookie, callback) {
    if(validCookies[cookie] !== undefined) {
        callback({username: validCookies[cookie].username, role: validCookies[cookie].role});
    }
    callback({error: 'wrong cookie'});
}


const server = http.createServer((req, res) => {
    const cookies = parseCookies(req.headers.cookie);
    console.log(cookies);
    // console.log(req);
    if(req.method === 'GET') {
        console.log('GET:', req.url);

        if (compareUrl(req.url, '/login')) {
            res.end(fs.readFileSync('login.html').toString());
        }

        if (compareUrl(req.url, '/index')) {
            cookieToUser(cookies['id'], (user) => {
                if (user.error === 'wrong cookie') {
                    res.end(fs.readFileSync('index.html').toString());
                }
                else if (user.role === 'admin') {
                    res.end(fs.readFileSync('indexAdmin.html'));
                }
                else if (user.role === 'user') {
                    res.end(fs.readFileSync('indexUser.html'));
                }
                else {
                    res.end('Internal error, code 1');
                }
            });
        }

        if(compareUrl(req.url, '/logout')) {
            res.writeHead(302, {
                'Set-Cookie': 'id=',
                'Location': 'index.html'
            });
            res.end();
        }
    }

    if(req.method === 'POST') {
        console.log('POST:', req.url);

        let body = '';

        req.on('data', (data) => {
            body += data;
            if (body.length > 1e6)
                req.connection.destroy();
        });

        req.on('end', function () {
            const post = qs.parse(body);
            console.log(post);
            if(req.url === '/index.html') {
                checkPassword(post.username, post.password, (result) => {
                    if(result.status === 'ok') {
                        const newCookie = crypto.randomBytes(24).toString('hex');
                        validCookies[newCookie] = {username: result.username, role: result.role};
                        console.log('New cookie:', newCookie, validCookies[newCookie]);
                        res.writeHead(302, {
                            'Set-Cookie': `id=${newCookie}`,
                            'Location': 'index.html'
                        });
                        res.end();
                    }
                    else {
                        res.writeHead(302, {
                            'Location': 'login.html?err=1'
                        });
                        res.end();
                    }
                })
            }
        });
    }

}).listen(8881);

