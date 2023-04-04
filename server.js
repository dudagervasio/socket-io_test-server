require('dotenv').config();

const { faker } = require('@faker-js/faker');

const PORT = 3303;
const fs = require('fs');
const https = require('https');
const http = require('http');
const express = require('express');

const webApp = express();

if(process.env.NODE_ENV !== 'development' ){

	// Certificate
	const privateKey = fs.readFileSync('/etc/letsencrypt/live/dgweb.com/privkey.pem', 'utf8');
	const certificate = fs.readFileSync('/etc/letsencrypt/live/dgweb.com/fullchain.pem', 'utf8');

	const credentials = {
		key: privateKey,
		cert: certificate,
	};

}

const server = process.env.NODE_ENV === 'development' 
				? http.createServer(webApp)
				: https.createServer(credentials, webApp);

const cors = require('cors');

const jwt = require('jsonwebtoken');

const io = require('socket.io')( server, {
	cors: {
		origin: '*',
	},
	pingTimeout: 500,
	maxHttpBufferSize: 1e7
});;

webApp.use( cors() );

server.listen(PORT, function(){

	console.log('listening on *:' + PORT);
});

const { chatData } = require('./chat-data');

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
  
 io.on('connect', (socket)=> {

	console.log(`Socket Connected: ${socket.id}`)

	socket.dg = {};

	socket.on("disconnect", (reason) => {

		console.log(`Socket Disconnected: ${socket.id}: ${reason}`);

	});

	socket.onAny( (eventName, ...args) => {

		console.log(`OnAny > '${eventName}' : ${args}`);

		//console.log( socket.decodedToken );

	});

	socket.on("chats", () => {

		socket.emit("chats", chatData);

		console.log(`Socket ${socket.id} > Event: chats`);
 
	});

	socket.on("actualChat", (actualChat) => {

		socket.dg.actualChat = actualChat;

		socket.emit("chats", chatData);

		console.log(`Socket ${socket.id} > Event: actualChat > ${socket.dg.actualChat}`);
 
	});



	setInterval(()=>{

		socket.emit('event_test', 'value');

	}, 2000);

})

let id = 20;

setInterval( ()=>{

	let newChat = {
		id: id++,
		name: faker.name.firstName(),
		src: faker.image.avatar(),
		message: faker.lorem.words(3),
		seen: faker.helpers.arrayElement([true, false]),
		status: faker.helpers.arrayElement([0, 1, 2, 3, 4]),
	};

	console.log({ newChat });

	chatData.push(
		{
			id: id++,
			name: faker.name.firstName(),
			src: faker.image.avatar(),
			message: faker.lorem.words(3),
			date: faker.date.weekday(),
			seen: faker.helpers.arrayElement([true, false]),
			status: faker.helpers.arrayElement([0, 1, 2, 3, 4]),
		}

	);

	io.emit('chats', chatData);

}, 10000);
