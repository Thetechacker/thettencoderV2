process.title = "thettencoderV2 - Decoder"

console.clear()

const pkg = require('./package.json')
const fs = require('fs')
const chalk = require('chalk')

process.title = `thettencoderV2@${pkg.version} - Decoder`

if(!fs.existsSync('./config.json')){
    console.log(chalk.redBright(`[config]: Missing "config.json" file.`))
    process.exit(1)
}

const config = require('./config.json')
const Jimp = require('jimp')
const path = require('path')

var ds = config.decoder_settings
var dvc = config.developer_options
var ex = (obj) => typeof obj === "string" && fs.existsSync(obj)

try {
    if(ds.path_file_to_decode && ex(ds.path_file_to_decode) && fs.statSync(ds.path_file_to_decode).isFile()){
        if(ds.path_file_vocabulary && ex(ds.path_file_vocabulary) && fs.statSync(ds.path_file_to_decode).isFile()){
            if(ds.output_file && typeof ds.output_file === "string"){
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

                                    hexarr = ds.save_unencoded_bytes ? [...hexarr, ...jhv.unencoded_bytes].filter(e => e) : hexarr.filter(e => e)
    
                                    console.log(chalk.greenBright(`[${ds.path_file_to_decode}]: Successfully decoded image.`))

                                    console.log(chalk.yellowBright(`[./output/${path.basename(ds.output_file)}]: Saving decoded image data as file...`))
    
                                    fs.writeFile(`./output/${path.basename(ds.output_file)}`, hexarr.map(e => e).join(""), { encoding: "hex" } , (err) => {
                                        if(err) return console.log(chalk.redBright(`[./output/${path.basename(ds.output_file)}]: Unable to write the decoded file:\n${err.stack}`))
    
                                        console.log(chalk.greenBright(`[./output/${path.basename(ds.output_file)}]: Done.`))
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
                console.log(chalk.redBright(`[fs]: Missing "output_file" filename.`))
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