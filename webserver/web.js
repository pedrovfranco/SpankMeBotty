const express = require('express')
const app = express()
const port = process.env.PORT || 5000;

const common = require('../common');

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.get('/registerTwitchToken', (req, res) => {
    res.send('Hello World!');

    console.log(JSON.stringify(req, '\n', 2));

    // common.registerTwitchToken("");
})


exports.startServer = () => app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})