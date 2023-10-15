const express = require('express');
const app = express();
const port = 9402;

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

//cors 문제 f12로 찾았을 때의 쾌감

app.get('/hi',hi);
app.listen(port,start_server);

function hi(req, res)
{
    res.send('나 강림');
}

function start_server()
{
    console.log(`과제욤(localhost:${port})`);
}