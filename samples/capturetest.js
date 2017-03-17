// raspistill - o shot - $SHOTTIME.jpg--nopreview--exposure sports--timeout 1

var starttime = Date.now();
var endtime;
var cameraParams = [];
var filePath = "bingo.jpg"
cameraParams.push('-vf');
cameraParams.push('-hf');
cameraParams.push('-np');
//cameraParams.push('-ex', "sports")
cameraParams.push('-o', filePath);
cameraParams.push('-t', 0)

starttime = Date.now();
console.log(cameraParams)
var spawn = require('child_process').spawn('raspistill', cameraParams);
spawn.on('exit', function(code) {
    endtime = Date.now();
    console.info("> saved [" + filePath + "]" + " exit code, " + code + " time: ", (endtime - starttime) / 1000);

});

spawn.on('error', function() {
    if (self.config.verboseLogging) {
        console.error("> there was an error capturing image [" + filePath + "]");
    }
    reject();
});
