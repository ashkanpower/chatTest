

var app = require("http").createServer(httpReq),
    url = require("url"),
    path = require("path"),
    fs = require("fs")
port = process.argv[2] || 8099,
io = require('socket.io').listen(app);


 io.set('log level', 1);


var databaseUrl = "mongodb://localhost:27017/msgdb"; // "username:password@example.com/mydb"
var collections = ["users", "messages"]
var db = require("mongojs").connect(databaseUrl, collections);


 function httpReq(request, response) {

     var uri = url.parse(request.url).pathname
       , filename = path.join(process.cwd(), uri);


     if (request.url == "/?name=shayan") {

         response.writeHead(200, { "Content-Type": "text/plain" });
         response.write("salam shayan");
         response.end();
         return;
     }

     fs.exists(filename, function (exists) {
         if (!exists) {
             response.writeHead(404, { "Content-Type": "text/plain" });
             response.write("404 Not Found\n");
             response.end();
             return;
         }

         if (fs.statSync(filename).isDirectory()) filename += '/index.html';

         fs.readFile(filename, "binary", function (err, file) {
             if (err) {
                 response.writeHead(500, { "Content-Type": "text/plain" });
                 response.write(err + "\n");
                 response.end();
                 return;
             }

             response.writeHead(200);
             response.write(file, "binary");
             response.end();
         });
     });
 };


app.listen(port);
 
console.log("file server running");

var clientCount = 0;





io.sockets.on('connection', function (socket) {

    clientCount++;

    var self = socket;

    console.log('new socket connected');



    //get recent messages mongo db

    db.messages.find({}, {}).limit(15).sort({date : -1 }, function (err, messages) {


        if (err || !messages) console.log("No message");
        else {

            var recents = [];

            messages.forEach(function (msg) {
                recents.push({
                    "message": msg.text, "name": msg.user.name, "date": msg.date
                });
            });


            self.emit('recents', recents);

        }
    });


    /////////////////


    socket.on('msg', function (data) {


        var msg = data.message;

        self.broadcast.emit('msg', {
            "message": msg, "name": socket.name, "date": new Date().getTime()
        });

        db.messages.save({ text: msg, date: new Date().getTime(), user: { name: socket.name } }, function (err, saved) {
            if (err || !saved) console.log("message error");
            else console.log("massage saved");
        });

    });


    socket.on('writing', function (data) {

       // self.broadcast.send('a');

    }); 

    socket.on('stopedwriting', function (data) {
        
       // self.broadcast.send('stopedwriting');

    });


    socket.on('introduce', function (data) {

        socket.name = data.name;

        console.log(data + "    " + data.name);
    });

    socket.on('disconnect', function () {

        clientCount--;

        /*io.sockets.emit('news', {
            count: clientCount
        });*/
    });
});