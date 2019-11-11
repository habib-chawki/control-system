const http = require("http");
const fs = require("fs");
const WebSocket = require("ws");
const firmata = require("firmata");

const wss = new WebSocket.Server({ port: 8888 });

let board = new firmata.Board("/dev/ttyACM0", () => {
  //Potentiometer pins
  board.pinMode(0, board.MODES.ANALOG);
  board.pinMode(1, board.MODES.ANALOG);

  //DC motor pins
  board.pinMode(2, board.MODES.OUTPUT);
  board.pinMode(3, board.MODES.PWM);
});

fs.readFile("./index.html", (err, html) => {
  if (!err) {
    http
      .createServer((req, res) => {
        res.writeHeader(200, { "Content-Type": "text/html" });
        res.write(html);
        res.end();
      })
      .listen(8080, "192.168.1.223", () => {
        console.log("Server running ...");
      });
  }
});

let sendValue = function() {},
  values = {},
  dcMotorSpeed,
  error,
  inputToHBridge;
const maxRightTurn = 875,
  maxLeftTrun = 135,
  factor = 2.5;

board.on("ready", () => {
  board.analogRead(0, value => {
    error = values.desiredValue - values.actualValue;

    //control DC motor speed
    inputToHBridge = Math.abs(error) * factor;
    dcMotorSpeed = inputToHBridge > 255 ? 255 : inputToHBridge;

    console.log("motor speed: " + dcMotorSpeed + " pot: " + values.actualValue);

    board.analogWrite(3, dcMotorSpeed);

    //control DC motor direction .. HIGH for right .. LOW for left
    error > 0
      ? board.digitalWrite(2, board.HIGH)
      : board.digitalWrite(2, board.LOW);

    //set limits for maximum turns
    if (value > maxRightTurn) value = maxRightTurn;
    else if (value < maxLeftTrun) value = maxLeftTrun;

    //set the new pivot
    //pivot = value;

    values.desiredValue = value;
    sendValue(JSON.stringify(values));
  });

  board.analogRead(1, value => {
    values.actualValue = value;
    sendValue(JSON.stringify(values));
  });
});

wss.on("connection", ws => {
  sendValue = values => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(values);
      } catch (e) {
        console.log("Something went wrong ... " + e);
      }
    }
  };
});
