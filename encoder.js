console.clear()

const pkg = require('./package.json')
const fs = require('fs')
const chalk = require('chalk')

process.title = `thettencoderV2@${pkg.version} - Encoder`

if(!fs.existsSync('./config.json')){
    console.log(chalk.redBright(`[config]: Missing "config.json" file.`))
    process.exit(1)
}

const config = require('./config.json')
const Jimp = require('jimp')
const path = require('path')

var decvals = []

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function chunk(str, size) {
    return str.match(new RegExp('.{1,' + size + '}', 'g'));
}

async function generateHexList(generate_elems_hexnum, digits){
    console.log(chalk.yellowBright(`[generateHexList]: Generating Hexadecimal List...`))

    var hexlist = []

    for(var i = 0; i < (parseInt(generate_elems_hexnum, 16) || 255) + 1; i++){
        var hexstr = (i).toString(16)

        if(digits){
            hexstr = "0".repeat(digits - hexstr.length) + hexstr
        }

        if(digits !== 1 && (hexstr.length % 2) == 1){
            hexstr = "0" + hexstr
        }

        hexlist.push(hexstr)
    }

    console.log(chalk.greenBright(`[generateHexList]: Done.`))

    return {list: hexlist, length: hexlist.length}
}

function RGBA2dec(json) {
    var res = Object.entries(json)
        .map(([a, b]) => b)
    
    return `${Jimp.rgbaToInt.apply(null, res)}`
}

function randomPixDecVal(){
    var rgba_json = {r: (Math.floor(Math.random() * 255) + 1), g: (Math.floor(Math.random() * 255) + 1), b: (Math.floor(Math.random() * 255) + 1), a: 255}
    const oh_yes = RGBA2dec(rgba_json)

    if(decvals.includes(oh_yes)){
        return randomPixDecVal()
    } else {
        decvals.push(oh_yes)

        return oh_yes
    }
}

var es = config.encoder_settings
var dvc = config.developer_options
var ex = (obj) => typeof obj === "string" && fs.existsSync(obj)

function encode(encode_str_func, hexvoc){
    fs.readFile(es.path_file_to_encode, { encoding: "hex" }, (err, buf) => {
        if(err) return console.log(chalk.redBright(`[fs]: Missing "path_file_to_encode" file.`))

        console.log(chalk.yellowBright(`[${es.path_file_to_encode}]: Encoding file...`))

        var hexarr = chunk(buf, dvc.hex_length)
        var unencoded_bytes = []
    
        for(var i = 0; i < hexarr.length; i++){
            if(hexarr[i].length == dvc.hex_length){
                hexarr[i] = encode_str_func(hexarr[i])
            } else {
                unencoded_bytes.push(hexarr[i])
                hexarr[i] = undefined
            }
        }

        hexarr = hexarr.filter(e => e)

        var perChunk = Math.floor(dvc.elems_per_chunk)
        
        var result = hexarr.reduce((resultArray, item, index) => {
            const chunkIndex = Math.floor(index / perChunk)
            
            if (!resultArray[chunkIndex]) {
                resultArray[chunkIndex] = []
            }
            
            resultArray[chunkIndex].push(item)
            
            return resultArray
        }, [])

        console.log(chalk.greenBright(`[${es.path_file_to_encode}]: Successfully encoded file.`))
        console.log(chalk.yellowBright(`[${es.path_file_to_encode}]: Saving the encoded file data as image...`))

        new Jimp(result[0].length, result.length, (err, image) => {
            if (err) throw err
            
            result.map((rowPixels, y) => rowPixels.map((pixel, x) => {
                var splt = pixel.split(',');
                var index = Number(splt[0]);
                image.setPixelColor(index, x, y)
            }))

            const filedet = path.parse(es.path_file_to_encode)

            image.write(`./output/${filedet.name}(${filedet.ext.slice(1, this.length)})_encoded_image.png`, async (err) => {
                if (err) throw err

                console.log(chalk.greenBright(`[${filedet.name}(${filedet.ext.slice(1, this.length)})_encoded_image.png]: Encoded file successfully.`))

                fs.writeFile(`./output/${filedet.name}(${filedet.ext.slice(1, this.length)})_info.json`, JSON.stringify({unencoded_bytes, vocabulary: hexvoc}), function(err){
                    if(err) throw err

                    console.log(chalk.greenBright(`[${filedet.name}(${filedet.ext.slice(1, this.length)})_info.json]: Saved file info & vocabulary.`))
                })
            })
        })
    })
}

try {
    if(es.path_file_to_encode && ex(es.path_file_to_encode)){
        if(typeof es.hex_vocabulary_path === "string"){
            console.log(chalk.yellowBright(`[Hex Vocabulary]: Reading Vocabulary File...`))

            fs.readFile(es.hex_vocabulary_path, { encoding: "utf8" }, (err, buf) => {
                if(err) return console.log(chalk.redBright(`[fs]: Missing "hex_vocabulary_path" file.`))

                try {
                    var jhv = JSON.parse(buf)
    
                    if(jhv.vocabulary && jhv.vocabulary.hex){
                        var hex = jhv.vocabulary
    
                        console.log(chalk.greenBright(`[Hex Vocabulary]: Successfully loaded Vocabulary File.`))
    
                        function encode_str(bytestr){
                            if(!hex.hex[`#${bytestr}`]){
                                console.log(chalk.redBright(`[Hex Vocabulary]: Missing byte "${bytestr}" in vocabulary.`))
                                process.exit(1)
                            } else {
                                return hex.hex[`#${bytestr}`]
                            }
                        }

                        encode(encode_str, hex)
                    } else {
                        console.log(chalk.redBright(`[Hex Vocabulary]: Missing Hex Vocabulary.`))
                    }
                } catch(err){
                    console.log(chalk.redBright(`[JSON.parse]: Bad JSON Configuration File.`))
                }  
            })
        } else {
            if(dvc.hex_length && typeof dvc.hex_length === "number" && dvc.hex_length >= 1 && dvc.hex_length != Infinity){
                if(dvc.elems_per_chunk && typeof dvc.elems_per_chunk === "number" && dvc.elems_per_chunk >= 1 && dvc.elems_per_chunk != Infinity){
                    generateHexList("f".repeat(dvc.hex_length), dvc.hex_length).then(res => {
                        var bytes_cp = res.list

                        console.log(chalk.yellowBright(`[Hex Vocabulary]: Assigning random DecPixVals to Hex Vocabulary.`))
                    
                        var hex = JSON.parse(`{ "hex": { ${bytes_cp.map((e, i, arr) => `"#${e}": "${randomPixDecVal()}"`).join(", ")} } }`)

                        console.log(chalk.greenBright(`[Hex Vocabulary]: Assigned DecPixVals to Hex Vocabulary.`))

                        function encode_str(bytestr){
                            return hex.hex[`#${bytestr}`]
                        }

                        encode(encode_str, hex)
                    })
                } else {
                    console.log(chalk.redBright(`[config]: "developer_options:num_chunks" must be an integer.`))
                }
            } else {
                console.log(chalk.redBright(`[config]: "developer_options:hex_length" must be an integer.`))
            }
        }
    } else {
        console.log(chalk.redBright(`[fs]: Missing "path_file_to_encode" file.`))
    }
} catch(err){
    console.error(chalk.redBright(`[thettencoderV2]: Unhandled error:\n${err.stack}`))
}
