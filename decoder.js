process.title = "thettencoderV2 - Decoder"

console.clear()

const config = require('./config.json')
const fs = require('fs')
const chalk = require('chalk')
const Jimp = require('jimp')
const path = require('path')

var ds = config.decoder_settings
var dvc = config.developer_options
var ex = (obj) => typeof obj === "string" && fs.existsSync(obj)

var getFromBetween = {
    results: [],
    string: "",
    getFromBetween: function (sub1, sub2) {
        if (this.string.indexOf(sub1) < 0 || this.string.indexOf(sub2) < 0) return false;
        var SP = this.string.indexOf(sub1) + sub1.length;
        var string1 = this.string.substr(0, SP);
        var string2 = this.string.substr(SP);
        var TP = string1.length + string2.indexOf(sub2);
        return this.string.substring(SP, TP);
    },
    removeFromBetween: function (sub1, sub2) {
        if (this.string.indexOf(sub1) < 0 || this.string.indexOf(sub2) < 0) return false;
        var removal = sub1 + this.getFromBetween(sub1, sub2) + sub2;
        this.string = this.string.replace(removal, "");
    },
    getAllResults: function (sub1, sub2) {
        if (this.string.indexOf(sub1) < 0 || this.string.indexOf(sub2) < 0) return;

        var result = this.getFromBetween(sub1, sub2);

        this.results.push(result);

        this.removeFromBetween(sub1, sub2);
        
        if (this.string.indexOf(sub1) > -1 && this.string.indexOf(sub2) > -1) {
            this.getAllResults(sub1, sub2);
        } else return;
    },
    get: function (string, sub1, sub2) {
        this.results = [];
        this.string = string;
        this.getAllResults(sub1, sub2);
        return this.results;
    }
};

try {
    if(ds.path_file_to_decode && ex(ds.path_file_to_decode) && fs.statSync(ds.path_file_to_decode).isFile()){
        if(ds.path_file_vocabulary && ex(ds.path_file_vocabulary) && fs.statSync(ds.path_file_to_decode).isFile()){
            if(dvc.output_dir && ex(dvc.output_dir) && fs.statSync(dvc.output_dir).isDirectory()){
                fs.readFile(ds.path_file_vocabulary, { encoding: "utf8" } ,(err, buf) => {
                    if(err) return console.log(chalk.redBright(`[fs]: Missing "path_file_to_encode" file.`))
    
                    try {
                        var jhv = JSON.parse(buf)
    
                        if(jhv.unencoded_bytes && Array.isArray(jhv.unencoded_bytes)){
                            if(jhv.vocabulary && jhv.vocabulary.hex){
                                jhv.unencoded_bytes = jhv.unencoded_bytes.filter(byte => typeof byte === "string")
                                var hex = Object.entries(jhv.vocabulary.hex)
    
                                function decode_str(dvcstr){
                                    var val = hex.find(e => e[1] === dvcstr)
    
                                    if(!val){
                                        console.log(chalk.redBright(`[Hex Vocabulary]: Missing byte of "${dvcstr}" in vocabulary.`))
                                        process.exit(1)
                                    } else {
                                        return val[0].startsWith("#") ? val[0].slice(1) : val[0]
                                    }
                                }
    
                                Jimp.read(ds.path_file_to_decode).then(image => {
                                    var width = image.bitmap.width
                                    var height = image.bitmap.height
                                    var pixels = []
                    
                                    console.log(chalk.yellowBright(`[${ds.path_file_to_decode}]: Reading the image...`))
                    
                                    for(var y = 0; y < height; y++){
                                        var rowPixels = []
                    
                                        for(var x = 0; x < width; x++){
                                            var pixel = image.getPixelColor(x, y)
                                            rowPixels.push(`${pixel}`)
                                        }
                    
                                        pixels.push(rowPixels)
                                    }
    
                                    console.log(chalk.greenBright(`[${ds.path_file_to_decode}]: Successfully loaded the image.`))
                    
                                    var hexarr = []
                    
                                    console.log(chalk.yellowBright(`[${ds.path_file_to_decode}]: Decoding image...`))
    
                                    pixels.map((y, ypos) => {
                                        y.map(x => {
                                            if(x !== "0"){
                                                hexarr.push(decode_str(x))
                                            } else {
                                                undefined
                                            }
                                        })
    
                                        if(dvc.log_info){
                                            console.log(chalk.yellowBright(`[Decoding progress]: Decoded ${ypos+1} ${ypos+1 > 1 ? "chunks" : "chunk"} of ${pixels.length} (${Math.floor(((ypos+1)/pixels.length)*100)}%)`))
                                        }
                                    })
    
                                    pixels.length = 0

                                    var d_nf = ds.path_file_to_decode.substr(0, ds.path_file_to_decode.indexOf('(')).split("./").join(""); var d_ext = getFromBetween.get(ds.path_file_to_decode, "(", ")"); d_ext[0] ? d_ext = `.${d_ext[0]}` : d_ext = `.ext`
                                    var c_nf = ds.path_file_vocabulary.substr(0, ds.path_file_vocabulary.indexOf('(')).split("./").join(""); var c_ext = getFromBetween.get(ds.path_file_vocabulary, "(", ")"); c_ext[0] ? c_ext = `.${c_ext[0]}` : c_ext = `.ext`
                                    var output_path = `${dvc.output_dir.endsWith("/") ? dvc.output_dir.slice(null, dvc.output_dir.length - 1) : dvc.output_dir}/${d_nf}${d_ext}`

                                    hexarr = d_nf + d_ext === c_nf + c_ext ? [...hexarr, ...jhv.unencoded_bytes].filter(e => e) : hexarr.filter(e => e)
    
                                    console.log(chalk.greenBright(`[${ds.path_file_to_decode}]: Successfully decoded image.`))

                                    console.log(chalk.yellowBright(`[${output_path}]: Saving decoded image data as file...`))
    
                                    fs.writeFile(output_path, hexarr.map(e => e).join(""), { encoding: "hex" } , (err) => {
                                        if(err) return console.log(chalk.redBright(`[${output_path}]: Unable to write the decoded file:\n${err.stack}`))
    
                                        console.log(chalk.greenBright(`[${output_path}]: Done.`))
                                    })
                                }).catch(err => {
                                    console.error(chalk.redBright(`[Jimp]: An error has occurred while reading the image data:\n${err.stack}`))
                                })
                            } else {
                                console.log(chalk.redBright(`[Hex Vocabulary]: Missing Hex Vocabulary.`))
                            }
                        } else {
                            console.log(chalk.redBright(`[Hex Vocabulary]: Missing Unencoded Bytes String Array.`))
                        }
                    } catch(err){
                        console.log(chalk.redBright(`[JSON.parse]: Bad JSON Configuration File.`))
                    }
                })
            } else {
                console.log(chalk.redBright(`[fs]: Missing "output_dir" directory.`))
            }
        } else {
            console.log(chalk.redBright(`[fs]: Missing "path_file_vocabulary" file.`))
        }
    } else {
        console.log(chalk.redBright(`[fs]: Missing "path_file_to_decode" file.`))
    }
} catch(err){
    console.error(chalk.redBright(`[thettencoderV2]: Unhandled error:\n${err.stack}`))
}