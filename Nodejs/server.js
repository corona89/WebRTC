/*
  webrtc_signal_server.js by Rob Manson
  The MIT License
  Copyright (c) 2010-2013 Rob Manson, http://buildAR.com. All rights reserved.
  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:
  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.
  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  THE SOFTWARE.
*/
// ���̺귯�� �ʱ�ȭ
var http = require("http"); // ������ ���
var fs = require("fs");     // ���� ���
var websocket = require("websocket").server;  // �����ϸ��

// ���뺯��
var port = 6002;
var webrtc_clients = [];      // �� ���� ������ ��� ����
var webrtc_discussions = {};  // 

// ������ ����
// �������� ������ �����ϱ� ������ web�� ���ؼ��� 404�� response ���ش�
var http_server = http.createServer(function(request, response) {
  //response.write(page);
  //response.end();
  response.writeHead(404);
  response.end();
});

// http server ������ ������ ��Ʈ�� ���ε�
http_server.listen(port, function() {
  log_comment("server listening (port "+port+")");
});

// ������ ó��
var websocket_server = new websocket({
  httpServer: http_server
});

// ���ο� ��û�� ó���ϴ� ���� �Լ�
websocket_server.on("request", function(request) {
  log_comment("new request ("+request.origin+")");
  
  // ��û �㰡
  var connection = request.accept(null, request.origin);
  log_comment("new connection ("+connection.remoteAddress+")");
  
  // ������ ����� ������ ��� �߰�
  webrtc_clients.push(connection);
  connection.id = webrtc_clients.length-1;
  
  // ������ �Ǿ����� ó��
  connection.on("message", function(message) {
    // utf8�� ó��
    if (message.type === "utf8") {
      log_comment("got message "+message.utf8Data);
      // ���� JSON �޽����� �Ľ�
      var signal = undefined;
      try { signal = JSON.parse(message.utf8Data); } catch(e) { };
      if (signal) {
        log_comment("token : " + signal.token);
        // �޽��� Ÿ���� join �ϰ�� && token �� �����ܿ�
        if (signal.type === "join" && signal.token !== undefined) {
          try {
            // �ű� ��ū�ϰ��
            if (webrtc_discussions[signal.token] === undefined) {
              // discussion�� ������ش�
              webrtc_discussions[signal.token] = {};
            }
          } catch(e) { };
          try {
            // ������ �濡(token) ����� ���̵� Ȱ��ȭ ���·� �����Ѵ�
            webrtc_discussions[signal.token][connection.id] = true;
          } catch(e) { };
        }
        // �޽��� Ÿ���� join�� �ƴѵ�token�� �������
        // �ٸ� �����ڵ鿡�� �����Ѵ�
        else if (signal.token !== undefined) {
          try {
            Object.keys(webrtc_discussions[signal.token]).forEach(function(id) {
              // �ڱ� �ڽſ��Դ� �������� ����
              if (id != connection.id) {
                log_comment("send id : " + id );
                webrtc_clients[id].send(message.utf8Data, log_error);
              }
            });
          } catch(e) { };
        }
        // �̿��� ���� ó������ �ʴ´�
        else {
          log_comment("invalid signal: "+message.utf8Data);
        }
      }
      // utf8 �̿��� ���� ó������ �ʴ´�
      else {
        log_comment("invalid signal: "+message.utf8Data);
      }
    }
  });
  
  // ������ ����� ��� ó��
  connection.on("close", function(connection) {
    log_comment("connection closed ("+connection.remoteAddress+")");
    Object.keys(webrtc_discussions).forEach(function(token) {
      Object.keys(webrtc_discussions[token]).forEach(function(id) {
        if (id === connection.id) {
          delete webrtc_discussions[token][id];
        }
      });
    });
  });
});

// utility functions
// ���� �α� �����
function log_error(error) {
  if (error !== "Connection closed" && error !== undefined) {
    log_comment("ERROR: "+error);
  }
}
// �α� �����
function log_comment(comment) {
  console.log((new Date())+" "+comment);
}
