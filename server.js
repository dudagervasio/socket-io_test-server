require('dotenv').config();


const fs = require('fs');
const https = require('https');
const http = require('http');
const express = require('express');
const cors = require('cors');

const { faker } = require('@faker-js/faker');

const PORT = 3303;

const webApp = express();

webApp.use( cors() );

console.log('NODE_ENV', process.env.NODE_ENV);

const credentials = {
	key: null,
	cert: null,
};


if(process.env.NODE_ENV !== 'development' ){

	// Certificate
	const privateKey = fs.readFileSync('/etc/letsencrypt/live/dgchat.com/privkey.pem', 'utf8');
	const certificate = fs.readFileSync('/etc/letsencrypt/live/dgchat.com/fullchain.pem', 'utf8');

	credentials.key = privateKey;
	credentials.cert = certificate;

}

const server = process.env.NODE_ENV === 'development' 
				? http.createServer(webApp)
				: https.createServer(credentials, webApp);



const jwt = require('jsonwebtoken');

const io = require('socket.io')( server, {
	cors: {
		origin: '*',
	},
	pingTimeout: 500,
	maxHttpBufferSize: 1e7
});;


server.listen(PORT, function(){

	console.log('listening on *:' + PORT);
});

const randomMessage = ({ type } = { type: null}) => {

	type = type ? type : faker.helpers.arrayElement(['chat', 'image', 'audio', 'video']);

	return {
		id: faker.random.alphaNumeric(24),
		type,
		self: faker.helpers.arrayElement(['in', 'out']),
		t: currentTimeInSeconds(),
		ack: faker.helpers.arrayElement([0, 1, 2, 3, 4]),
		body: (type === 'image' || type === 'video') ? "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEgAKAMBIgACEQEDEQH/xAAsAAEBAQEBAAAAAAAAAAAAAAAAAgEDBQEBAQEAAAAAAAAAAAAAAAAAAAEC/9oADAMBAAIQAxAAAABtbHPrthQ47mi4osHFWG7NFg56BuHRg8uCanmEhf/EACUQAAIBAgUDBQAAAAAAAAAAAAABAhAxAwQSFCAhMkERQlFSYv/aAAgBAQABPwDSKI4dRRNIyHUldCqiXgXCXgVGIbsK9fQlZC4S7RCoifaRo8/+DfT+EPO4rHm8b7G5xn7z/8QAFBEBAAAAAAAAAAAAAAAAAAAAMP/aAAgBAgEBPwB//8QAFhEAAwAAAAAAAAAAAAAAAAAAEBEw/9oACAEDAQE/AKI//9k=" : faker.lorem.words( faker.random.numeric(1) ),
		isForwarded: faker.helpers.arrayElement([ true, false ]),
		imageUrl: type === 'image' ? faker.image.imageUrl(640, 480, 'cat', true) : null,
		audioUrl: type === 'audio' ? faker.helpers.arrayElement([
			'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
			'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
			'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
			'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
		]) : null,
		videoUrl: type === 'video' ? faker.helpers.arrayElement([
			'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
			'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
			'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
			'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
		]) : null,
	}

}

const randomChat = () => {

	return {
		id: faker.random.alphaNumeric(12),
		name: faker.name.firstName(),
		avatarUrl: faker.image.avatar(),
		lastMessage: faker.lorem.words(3),
		phoneNumber: faker.phone.number('+55 (##) 9####-####'),
		date: faker.date.weekday(),
		seen: faker.helpers.arrayElement([true, false]),
		status: faker.helpers.arrayElement([0, 1, 2, 3, 4]),
	};
	
}

const currentTimeInSeconds = () => ((new Date()).getTime() / 1000).toFixed(0);

//const { chatData } = require('./chat-data');
//const { messages } = require('./message-data');

const messages = [];
const chats = [];

messages.push( randomMessage( { type: 'chat' }));
messages.push( randomMessage( { type: 'image' }));
messages.push( randomMessage( { type: 'audio' }));
messages.push( randomMessage( { type: 'video' }));

chats.push( randomChat() );
chats.push( randomChat() );
chats.push( randomChat() );
chats.push( randomChat() );
chats.push( randomChat() );
chats.push( randomChat() );

io.use(function(socket, next){

	console.log('Middleware Updated');

	if (socket.handshake.auth && socket.handshake.auth.token){

		const { token } = socket.handshake.auth;

		console.log('Middleware: Handshake');

		jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function(err, decoded) {

			if (err) return next( new Error('Auth error'));

			socket.isAuth = true;
			socket.token = token;
			socket.decodedToken = decoded;

			next();

	  	});
	
	}else{
	
		return next( new Error('Auth error'));
	}    

 });
  
 io.on('connect', (socket) => {

	console.log(`Socket Connected: ${socket.id}`);

	socket.dg = {};

	socket.on("disconnect", (reason) => {

		console.log(`Socket Disconnected: ${socket.id}: ${reason}`);

	});

	socket.onAny( (eventName, ...args) => {

		console.log(`OnAny > '${eventName}' : ${args}`);

		//console.log( socket.decodedToken );

	});

	socket.on("chats", () => {

		socket.emit("chats", chats);

		console.log(`Socket ${socket.id} > Event: chats`);
 
	});

	socket.on("messages", () => {

		socket.emit("messages", messages);

		console.log(`Socket ${socket.id} > Event: messages`);
 
	});

	socket.on("actualChat", (actualChat) => {

		socket.dg.actualChat = actualChat;

		socket.emit("chats", chats);

		socket.emit("messages", messages);

		console.log(`Socket ${socket.id} > Event: actualChat > ${socket.dg.actualChat}`);
 
	});

	setInterval( () => {

		messages.push( randomMessage() );

		socket.emit('messages', messages);

		console.log('messages emited', socket.id);

	}, 30_000);


/* 	setInterval(()=>{

		socket.emit('event_test', 'value');

	}, 2000);
 */
})

let id = 20;

setInterval( () => {

	chats.push( randomChat() );

	io.emit('chats', chats);

}, 30_000);

