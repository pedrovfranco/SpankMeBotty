const express = require('express')
const app = express()
const port = process.env.PORT || 5000;

const common = require('../common/common');
const inygonAnnouncer = require('../routines/inygonAnnouncer');

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.get('/checkInygonStream', (req, res) => {
    
    inygonAnnouncer.checkForStream();

    res.send();

})


exports.startServer = () => app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})