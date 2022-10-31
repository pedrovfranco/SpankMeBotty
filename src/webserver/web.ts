import express from 'express';
const app = express()
const port = process.env.PORT || 5000;

import { checkForStream } from '../routines/inygonAnnouncer';

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.get('/checkInygonStream', (req, res) => {
    checkForStream();
    res.send();
})


export function startServer() {
    app.listen(port, () => {
        console.log(`Example app listening at http://localhost:${port}`)
    })
}