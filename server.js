"use strict";

const http = require('http');
const fs = require('fs');
const qs = require('querystring');
const crypto = require('crypto');

const messages = {};
const status = new Map();
status.set('Espoo', {
    currentLoad: 12.1,
    maxLoad: 90.0,
    status: 'Running',
    toggleStatus: 'on',
});

status.set('Vantaa', {
    currentLoad: 9.6,
    maxLoad: 70.0,
    status: 'Running',
    toggleStatus: 'on',
});

status.set('Helsinki', {
    currentLoad: 42.0,
    maxLoad: 120.0,
    status: 'Running',
    toggleStatus: 'on',
});

status.set('Helsinki2', {
    currentLoad: 0.0,
    maxLoad: 80.0,
    status: 'Ready',
    toggleStatus: 'off',
});

function sendMessage(sender, receiver, message) {
    if(messages[receiver] === undefined) {
        messages[receiver] = {
            messages: [],
            unreadCount: 0,
        };
    }

    messages[receiver].messages.push({author: sender, body: message, date: (new Date()).valueOf()});
    messages[receiver].unreadCount++;
}

function getMessages(username, callback) {
    if(messages[username] === undefined)
        callback([]);
    else
        callback(messages[username].messages);
}

function getUnreadCount(username, callback) {
    if(messages[username] === undefined)
        callback(0);
    else
        callback(messages[username].unreadCount);
}

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

function getStatus(callback) {
    // const wyn = {};
    // status.forEach((key, val) => {
    //     wyn[key] = val;
    // });
    //
    // callback(wyn);

    callback(status);
}

function changeStatus(target, callback) {
    if(status.has(target)) {
        const tmp = status.get(target);
        if(tmp.toggleStatus === 'on') {
            tmp.toggleStatus = 'off';
            tmp.status = 'Ready';
            tmp.currentLoad = 0;
        }
        else {
            tmp.toggleStatus = 'on';
            tmp.status = 'Running';
            tmp.currentLoad = parseFloat(Math.random() * tmp.maxLoad);
        }

        status.set(target, tmp);
        callback(tmp);
    }
    else
        callback({}, 'err');
}

function fillNavbar(username, pageString, callback) {
    let wyn = pageString.replace('##username##', username);
    getUnreadCount(username, (unreadCount) => {
        wyn = wyn.replace('##unread##', unreadCount);
        callback(wyn);
    });
}

function fillStatus(role, htmlString, callback) {
    let status = fs.readFileSync('statusTemplate.html').toString();
    const script = 'function toggle(target) {' +
        'var req = new XMLHttpRequest();' +
        'req.onreadystatechange = () => handleToggle(target, req);' +
        'req.open("GET", `/toggle=${target}`, true);' +
        'req.send()' +
        '}';
    if(role === 'admin') {
        status = status.replace('##>#', '').replace('###', '').replace('##script##', script);
    }
    else {
        status = status.replace('##>#', '<!--').replace('###', '-->').replace('##script##', '');
    }

    let body = '';

    getStatus((res) => {
        res.forEach((val, key) => {
            let row = '<tr>';
            row += `<td>${key}</td>`;
            row += `<td id="load_${key}">${val.currentLoad.toFixed(1)}kW</td>`;
            row += `<td>${val.maxLoad.toFixed(1)}kW</td>`;
            row += `<td id="status_${key}">${val.status}</td>`;
            if(role === 'admin') {
                    row += '<td>' +
                        '<label class="switch">' +
                        `<span id="switch_${key}" class="slider ${val.toggleStatus === 'on' ? 'checked' : ''} round" onclick="toggle('${key}')"></span>` +
                        '</td>'
            }

            row += '</tr>';

            body += row;
        });

        status = status.replace('##body##', body);

        const wyn = htmlString.replace('##status##', status);
        callback(wyn);
    });
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
        else if (req.url === '/') {
            res.writeHead(302, {
                'Location': 'index.html'
            });
            res.end();
        }
        else if (compareUrl(req.url, '/index')) {
            cookieToUser(cookies['id'], (user) => {
                if (user.error === 'wrong cookie') {
                    fillStatus('anonymous', fs.readFileSync('index.html').toString(), (fullPageHTML) => {
                        res.end(fullPageHTML);
                    })
                }
                else if (user.role === 'admin') {
                    fillNavbar(user.username, fs.readFileSync('indexAdmin.html').toString(), (pageHTML) => {
                        fillStatus(user.role, pageHTML, (fullPageHTML) => {
                            res.end(fullPageHTML);
                        });
                    });
                }
                else if (user.role === 'user') {
                    fillNavbar(user.username, fs.readFileSync('indexUser.html').toString(), (pageHTML) => {
                        fillStatus(user.role, pageHTML, (fullPageHTML) => {
                            res.end(fullPageHTML);
                        })
                    });
                }
                else {
                    res.end('Internal error, code 1');
                }
            });
        }
        else if (compareUrl(req.url, '/messages')) {
            cookieToUser(cookies['id'], (user) => {
                if (user.role === 'admin') {
                    fillNavbar(user.username, fs.readFileSync('messagesAdmin.html').toString(), (pageHTML) => {
                        res.end(pageHTML);
                    });
                }
                else {
                    fillNavbar(user.username, fs.readFileSync('messagesUser.html').toString(), (pageHTML) => {
                        res.end(pageHTML);
                    });
                }
            });
        }
        else if (compareUrl(req.url, '/users')) {
            cookieToUser(cookies['id'], (user) => {
                fillNavbar(user.username, fs.readFileSync('users.html').toString(), (pageHTML) => {
                    res.end(pageHTML);
                });
            });
        }
        else if(compareUrl(req.url, '/logout')) {
            res.writeHead(302, {
                'Set-Cookie': 'id=',
                'Location': 'index.html'
            });
            res.end();
        }
        else if (compareUrl(req.url, '/toggle')) {
            const target = req.url.split('toggle=')[1];
            if(target !== undefined) {
                console.log(`Requested toggle for ${target}`);
                changeStatus(target, (status, err) => {
                    console.log(status, err);
                    if(err === undefined) {
                        res.end(JSON.stringify(status));
                    }
                    else
                        res.end(JSON.stringify({error: 'err1'}));
                })
            }
            else
                res.end(JSON.stringify({error: 'err2'}));
        }
        else {
            const path = req.url[0] === '/' ? `.${req.url}` : req.url;

            if(fs.existsSync(path)) {
                res.end(fs.readFileSync(path));
            }
            else {
                console.log(`Requested file ${path} doesn't exist`);
                res.writeHead(404);
                res.end('Not found');
            }
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
                        validCookies[newCookie] = {username: post.username, role: result.role};
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

console.log('Server running at http://localhost:8881');
