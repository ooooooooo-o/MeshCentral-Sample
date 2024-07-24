"use strict";

const express = require('express');
const https = require('https');
const bodyParser = require('body-parser');
const fs = require('fs');
const app = express();

module.exports.sample = function (parent) {
    var obj = {};
    obj.parent = parent; // keep a reference to the parent
    obj.exports = [
        "onDesktopDisconnect" // export this function to the web UI
    ];

    obj.onDesktopDisconnect = function() {  // this is called when the desktop disconnect button is clicked
        writeDeviceEvent(encodeURIComponent(currentNode._id));  // mimic what the button does on the device main page to pull up a log
        Q('d2devEvent').value = Date().toLocaleString() + ': '; // pre-fill the date for a timestamp
        focusTextBox('d2devEvent');
    }

    // Function to write data to MeshCentral log
    obj.writeToMeshLog = function(data) {
        if (obj.parent && obj.parent.webserver && obj.parent.webserver.dispatchEvent) {
            obj.parent.webserver.dispatchEvent([
                { action: 'log', msg: `Received data: ${data.data} from IP: ${data.ip}`, nodeid: null, eventType: 'custom' }
            ]);
        }
    }

    return obj;
}

// Express Server for Logging
const path = '/home/restricteduser/log/receivedData.txt';

const server = https.createServer({
    key: fs.readFileSync('/home/restricteduser/log/production.key'),
    cert: fs.readFileSync('/home/restricteduser/log/production.crt'),
}, app);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const writeDataToFile = (data) => {
    fs.readFile(path, 'utf8', (err, content) => {
        let dataList = [];

        if (!err) {
            try {
                dataList = JSON.parse(content);
            } catch (parseErr) {
                console.error('Error parsing file content:', parseErr);
            }
        }

        dataList.push(data);

        fs.writeFile(path, JSON.stringify(dataList, null, 2), (writeErr) => {
            if (writeErr) {
                console.error('Error writing to file:', writeErr);
            }
        });
    });
};

app.post('/Logger', (req, res) => {
    const receivedData = req.body.data;
    const clientIp = req.ip;

    console.log('Received data:', receivedData, 'from IP:', clientIp);

    // Write data to file
    writeDataToFile({ data: receivedData, ip: clientIp });

    // Log data in MeshCentral
    if (module.exports.sample.writeToMeshLog) {
        module.exports.sample.writeToMeshLog({ data: receivedData, ip: clientIp });
    }

    res.sendStatus(200);
});

app.get('/Logger', (req, res) => {
    const receivedData = req.query.data;
    const clientIp = req.ip;

    console.log('Received data:', receivedData, 'from IP:', clientIp);

    // Write data to file
    writeDataToFile({ data: received
