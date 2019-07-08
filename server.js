var express = require("express")
var app = express()
const PORT = 3000;
var path = require("path")
var hbs = require('express-handlebars');
const request = require('request-promise');
var officegen = require('officegen');
var docx = officegen('docx');
var upload = require("express-fileupload");
var mammoth = require("mammoth");
const uuidv4 = require("uuid/v4");
const tempfile = require('tempfile');
var filename, textConverted;
var translatedWords = []


app.use(express.static('static'))
app.use(upload());
app.set('views', path.join(__dirname, 'views'));
app.engine('hbs', hbs({ defaultLayout: 'main.hbs' }));
app.set('view engine', 'hbs');


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
        // first check to see if we do have both substrings
        if (this.string.indexOf(sub1) < 0 || this.string.indexOf(sub2) < 0) return;

        // find one result
        var result = this.getFromBetween(sub1, sub2);
        // push it to the results array
        this.results.push(result);
        // remove the most recently found one from the string
        this.removeFromBetween(sub1, sub2);

        // if there's more substrings
        if (this.string.indexOf(sub1) > -1 && this.string.indexOf(sub2) > -1) {
            this.getAllResults(sub1, sub2);
        }
        else return;
    },
    get: function (string, sub1, sub2) {
        this.results = [];
        this.string = string;
        this.getAllResults(sub1, sub2);
        return this.results;
    }
};

app.post('/', function (req, res) {
    // var tempFilePath = tempfile('.docx');
    // docx.setDocSubject('testDoc Subject');
    // docx.setDocKeywords('keywords');
    // docx.setDescription('test description');

    // var pObj = docx.createP({ align: 'center' });
    // pObj.addText('Policy Data', { bold: true, underline: true });

    // docx.on('finalize', function (written) {
    //     console.log('Finish to create Word file.\nTotal bytes created: ' + written + '\n');
    // });
    // docx.on('error', function (err) {
    //     console.log(err);
    // });

    // res.writeHead(200, {
    //     "Content-Type": "application/vnd.openxmlformats-officedocument.documentml.document",
    //     'Content-disposition': 'attachment; filename=testdoc.docx'
    // });
    // docx.generate(res);
})


app.get("/", function (req, res) {
    var pObj = docx.createP({ backline: 'E0E0E0' });
    pObj.addText('Backline text1');
    pObj.addText(' text2');
    // for (let i = 0; i < words.length; i++) {
    //     arrayOfPromises.push(call(words[i]))
    // }

    // async function call(word) {
    //     let optAzure = {
    //         method: "POST",
    //         baseUrl: "https://api.cognitive.microsofttranslator.com/",
    //         url: "translate",
    //         qs: {
    //             "api-version": "3.0",
    //             from: "de",
    //             to: ["de", "pl"]
    //         },
    //         headers: {
    //             "Ocp-Apim-Subscription-Key": "20c6f843ccfe4dd59a5e26484138cf01",
    //             "Content-type": "application/json",
    //             "X-ClientTraceId": uuidv4().toString()
    //         },
    //         body: [
    //             {
    //                 text: word
    //             }
    //         ],
    //         json: true
    //     };

    //     let optPonse = {
    //         uri: 'https://api.pons.com/v1/dictionary',
    //         headers: {
    //             'Content-type': 'application/x-www-form-urlencoded',
    //             "x-secret": "cd0132b6a2b33b6880d0b79dd1946a5456d00bc1b861cb1f281fea5f01313103",
    //         },
    //         qs: {
    //             q: word,
    //             in: "de",
    //             language: "de",
    //             l: "depl",
    //             ref: true,
    //             json: true,
    //         }
    //     }

    //     let resultAzure = await request(optAzure);
    //     let resultPonse = await request(optPonse);
    //     //await zapytanie do azure
    //     //await zapytanie do ponse
    //     //return {azure,pons}
    //     return { resultAzure, resultPonse };
    // }

    // Promise.all(arrayOfPromises).then((result) => {
    //     console.log(result[0].resultPonse)

    // })

    res.render('index')
})

app.post("/upload", function (req, res) {
    let arrayOfPromises = []
    if (req.files) {
        // console.log(req.files.upfile.name)
        filename = req.files.upfile.name
        var file = req.files.upfile

        file.mv("./upload/" + filename, function (err) {
            if (err) {
                console.log(err);
                res.send("error")
            } else {
                res.send("DONE")
                mammoth.extractRawText({ path: "path/to/document.docx" })
                    .then(function (result) {
                        var text = result.value; // The raw text
                        var messages = result.messages;
                    })
                    .done();
                mammoth.convertToHtml({ path: "./upload/" + filename })
                    .then(function (result) {
                        textConverted = result.value; // The raw text
                        var messages = result.messages;
                        var results = getFromBetween.get(textConverted, "<strong>", "</strong>");
                        console.log(results)
                        var words = results
                        for (let i = 0; i < words.length; i++) {
                            arrayOfPromises.push(call(words[i]))
                        }
                        async function call(word) {
                            // zapytanie do azure 
                            let optAzure = {
                                method: "POST",
                                baseUrl: "https://api.cognitive.microsofttranslator.com/",
                                url: "translate",
                                qs: {
                                    "api-version": "3.0",
                                    from: "de",
                                    to: ["de", "pl"]
                                },
                                headers: {
                                    "Ocp-Apim-Subscription-Key": "20c6f843ccfe4dd59a5e26484138cf01",
                                    "Content-type": "application/json",
                                    "X-ClientTraceId": uuidv4().toString()
                                },
                                body: [
                                    {
                                        text: word
                                    }
                                ],
                                json: true
                            };
                            // zapytanie do ponse
                            let optPonse = {
                                uri: 'https://api.pons.com/v1/dictionary',
                                headers: {
                                    'Content-type': 'application/x-www-form-urlencoded',
                                    "x-secret": "cd0132b6a2b33b6880d0b79dd1946a5456d00bc1b861cb1f281fea5f01313103",
                                },
                                qs: {
                                    q: word,
                                    in: "de",
                                    language: "de",
                                    l: "depl",
                                    ref: true,
                                    json: true,
                                }
                            }

                            let resultAzure = await request(optAzure);
                            let resultPonse = await request(optPonse);
                            //await zapytanie do azure
                            //await zapytanie do ponse
                            //return {azure,pons}
                            return { resultAzure, resultPonse };
                        }
                        var translatedPonse = []
                        Promise.all(arrayOfPromises).then((result) => {
                            var translate = result
                            translate.map(m => {
                                translatedPonse.push(JSON.parse(m.resultPonse))
                                translatedWords.push({ azureSource: m.resultAzure[0].translations[0].text, azureTarget: m.resultAzure[0].translations[1].text })
                            })

                            var determiners = [];

                            translatedPonse.map(w => {
                                console.log(w[0].hits[0].roms[0].wordclass)
                                if (w[0].hits[0].roms[0].arabs[0].translations[0].target.includes("Maskulinum")) {
                                    determiners.push("Der")
                                } else if (w[0].hits[0].roms[0].arabs[0].translations[0].target.includes("Femininum")) {
                                    determiners.push("Die")
                                } else if (w[0].hits[0].roms[0].arabs[0].translations[0].target.includes("Neutrum")) {
                                    determiners.push("Das")
                                } else {
                                    determiners.push("")
                                }
                            })
                            var readyWords = []
                            for (let i = 0; i < translatedWords.length; i++) {
                                if (!readyWords.includes(determiners[i] + " " + translatedWords[i].azureSource)) {
                                    readyWords.push({ source: determiners[i] + " " + translatedWords[i].azureSource, target: translatedWords[i].azureTarget })

                                }
                            }
                            console.log(readyWords)
                            //console.log(determiners)

                        })
                    })
                    .done();
            }
        })
    }
})

app.listen(PORT, function () {
    console.log("start serwera na porcie " + PORT)
})
