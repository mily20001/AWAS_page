"use strict";

const http = require('http');
const fs = require('fs');

const server = http.createServer((req, res) => {
    console.log(req.headers.cookie);
    console.log(req.url);

}).listen(8881);

