const express = require('express');
const bodyParser = require('body-parser');
const amqp = require('amqp');
const amqplib = require('amqplib/callback_api');

const mongo = require('./clients/mongo');
const { sleep, generateRandomNum } = require('./utils');
const connect_string = "amqp://wkafrcbe:1ViiiKO_aoReBs2KNvIbdWMAlVXsYejN@gull.rmq.cloudamqp.com/wkafrcbe";

const server = express();

server.use(bodyParser.json());

/* Method 1
let ch = null;
amqplib.connect(connect_string, (err, conn)=> {
   conn.createChannel((err, channel)=> {
      ch = channel;
   });
});
const publishToQueue = async (queueName, data) => {
   ch.publish(queueName, data);
}
process.on('exit', (code) => {
   ch.close();
   console.log(`Closing rabbitmq channel`);
});
*/
let connection = amqp.createConnection({url: connect_string}, {defaultExchangeName: ''});
connection.on('ready', ()=> {

    console.log('Connected to rabbitmq');
});

server.get('/health', (_, res) => {
    return res.sendStatus(204);
});

server.post('/users', async (req, res, next) => {

    let queue = "work-queue";
    let message = req.body;

    const user = await mongo.user.create(req.body);
    //await publishToQueue(queue, message);

    await connection.publish(queue, message);

    //res.statusCode = 200;
    //res.data = {"message-sent":true};
    //next();

    /* Tried to consume from queue and apply somethingSlow as callback function but ran into 'undefined' response error when trying to call amqplib.consume due to conn.createChannel

    amqplib.connect(process.env.connect_string, (err, conn)=> {
        conn.createChannel((err, ch) =>{
          ch.consume('work-queue',somethingSlow(user._id),{ noAck: true });
        });
      });
      */
      
    await somethingSlow(user._id);

    return res.status(200).json(user);
});

async function somethingSlow(userID) {
    await mongo.user.updateOne({ _id: userID }, { $set: { processed: true } });
    
    const sleepSeconds = generateRandomNum(5, 15);
    return await sleep(sleepSeconds * 1000);
}



server.delete('/collections', async (req, res) => {
    await mongo.flushCollections();
    return res.sendStatus(200);
});

module.exports = server;