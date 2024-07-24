"use strict";

module.exports = function (parent) {
  const express = require('express');
  const bodyParser = require('body-parser');
  const fs = require('fs');
  const app = express();
  const LOG_FILE = 'receivedData.txt'; 

  // === MeshCentral Sample Module ===
  var obj = {};
  obj.parent = parent; 
  obj.exports = ["onDesktopDisconnect"];

  obj.onDesktopDisconnect = function () { 
    writeDeviceEvent(encodeURIComponent(currentNode._id)); 
    Q('d2devEvent').value = Date().toLocaleString() + ': '; 
    focusTextBox('d2devEvent');
  };

  obj.writeToMeshLog = function (data) {
    if (obj.parent && obj.parent.webserver && obj.parent.webserver.dispatchEvent) {
      obj.parent.webserver.dispatchEvent([
        { action: 'log', msg: `Received data: ${data.data} from IP: ${data.ip}`, nodeid: null, eventType: 'custom' }
      ]);
    }
  };

  // === Logging Server ===
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  function writeDataToFile(data) {
    fs.readFile(LOG_FILE, 'utf8', (readErr, content) => {
      let dataList = [];
      if (!readErr) {
        try {
          dataList = JSON.parse(content);
        } catch (parseErr) {
          console.error('Error parsing log file:', parseErr);
        }
      }
      dataList.push(data);
      fs.writeFile(LOG_FILE, JSON.stringify(dataList, null, 2), (writeErr) => {
        if (writeErr) {
          console.error('Error writing to log file:', writeErr);
        }
      });
    });
  }

  app.post('/Logger', (req, res) => {
    const { data } = req.body;
    const clientIp = req.ip;
    console.log('POST Received data:', data, 'from IP:', clientIp);
    writeDataToFile({ data, ip: clientIp });
    obj.writeToMeshLog({ data, ip: clientIp });
    res.sendStatus(200);
  });

  app.get('/Logger', (req, res) => {
    const clientIp = req.ip;
    const receivedData = req.query.data || ''; // Lấy dữ liệu (nếu có) từ query string

    console.log('GET Received data:', receivedData, 'from IP:', clientIp);
    writeDataToFile({ data: receivedData, ip: clientIp });

    const currentNode = parent.webserver.ws.nodes[parent.webserver.ws.m];
    if (currentNode && currentNode._id) {
      const message = `Client IP: ${clientIp} connected to node ${currentNode._id}`;
      obj.writeToMeshLog({ data: message, ip: clientIp });
      res.send(message); 
    } else {
      res.status(500).send('Node information not found');
    }
  });

  // Khởi tạo server HTTP
  const server = app.listen(parent.webserver.port, () => {
    console.log('Logging server listening on port:', parent.webserver.port);
  });

  return {
    server: server,
    stop: () => {
      server.close();
    },
    sample: obj 
  };
};
