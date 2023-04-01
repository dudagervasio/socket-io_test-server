require('dotenv').config();


const PORT = 3303;
const fs = require('fs');
const https = require('https');
const express = require('express');

const webApp = express();

// Certificate
const privateKey = fs.readFileSync('/etc/letsencrypt/live/dgweb.com/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/dgweb.com/fullchain.pem', 'utf8');

const credentials = {
	key: privateKey,
	cert: certificate,
};

const httpsServer = https.createServer(credentials, webApp);

const cors = require('cors');

const jwt = require('jsonwebtoken');

const io = require('socket.io')( httpsServer, {
	cors: {
		origin: '*',
	},
	pingTimeout: 500,
	maxHttpBufferSize: 1e7
});;

webApp.use( cors() );

httpsServer.listen(PORT, function(){

	console.log('listening on *:' + PORT);
});

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

	socket.onAny( (eventName, ...args) => {

		console.log(`${eventName}: ${args}`);

		//console.log( socket.decodedToken );

	})

})