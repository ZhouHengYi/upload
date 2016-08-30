var express = require('express');
var resumable = require('./resumable-node.js')('./upload/');
var app = express();
var multipart = require('connect-multiparty');
var Path = require('path');
var fs = require('fs')
var Promise = require('promise')

var mkdirs = function(dirpath, mode, callback) {
    fs.exists(dirpath, function(exists) {
        if(exists) {
            callback(dirpath);
        } else {
            //尝试创建父目录，然后再创建当前目录
            mkdirs(Path.dirname(dirpath), mode, function(){
                    fs.mkdir(dirpath, mode, callback);
            });
        }
    });
};
var upFile = function(targetPath,wsPath){
    return new Promise((resolve, reject) => {
        mkdirs(Path.dirname(targetPath),777,() => {
            fs.rename(wsPath, targetPath, function(err) {
                if (err) {
                  console.log('rename error: ' + err);
                } else {
                  console.log('rename ok');
                }
              });
            resolve(true)
        })
    });
    
}
// Host most stuff in the public folder
app.use(express.static(__dirname + '/public'));

app.use(multipart());

// Uncomment to allow CORS
// app.use(function (req, res, next) {
//    res.header('Access-Control-Allow-Origin', '*');
//    next();
// });

// Handle uploads through Resumable.js
app.post('/upload', function(req, res) {

    resumable.post(req, function(status, filename, original_filename, identifier) {
        console.log('POST', status, original_filename, identifier);

        res.send(status);
    });
});
app.post('/uploadDir', function(req, res) {
    console.log(req.files.file)
    var ups = []
    for (var i = req.files.file.length - 1; i >= 0; i--) {
        var wsPath = req.files.file[i].ws.path
        //get filename
        var filename = req.files.file[i].originalFilename || Path.basename(wsPath);
        //copy file to a public directory
        var targetPath = Path.dirname(__filename) + '/public/uploadDir/' + filename;
        console.log(targetPath,wsPath)
        ups.push(upFile(targetPath,wsPath))
    }
    Promise.all(ups).then((_result) => {
        //return file url
        res.json({
            code: 200,
            body:_result
        });
    })
});

// Handle status checks on chunks through Resumable.js
app.get('/upload', function(req, res) {
    resumable.get(req, function(status, filename, original_filename, identifier) {
        console.log('GET', status);
        res.send((status == 'found' ? 200 : 404), status);
    });
});

app.get('/download/:identifier', function(req, res) {
    resumable.write(req.params.identifier, res);
});

app.listen(3003);