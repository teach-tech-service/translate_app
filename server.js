require('./db/db')
var express = require("express")
var app = express()
const PORT = 3000;
var path = require("path")
var hbs = require('express-handlebars');
const request = require('request-promise');
var upload = require("express-fileupload");
var mammoth = require("mammoth");
var mongoose = require('mongoose')
const uuidv4 = require("uuid/v4");
var officegen = require("officegen");
var path = require("path")
var Word = require("./models/words")
var filename, textConverted, plainText;
var translatedWords = []
var words = []
var translate = []
var promiseTranslated = []
var table = []
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


app.get("/", function (req, res) {
    Word.find({ word: 'Katze' }, function (err, docs) {
        console.log(docs);
    });
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
                // res.send("DONE")
                mammoth.extractRawText({ path: "./upload/" + filename })
                    .then(function (result) {
                        plainText = result.value; // The raw text
                        var messages = result.messages;
                        console.log(plainText, 'pl')
                    })
                    .done();
                mammoth.convertToHtml({ path: "./upload/" + filename })
                    .then(function (result) {
                        textConverted = result.value; // The raw text
                        var messages = result.messages;
                        var results = getFromBetween.get(textConverted, "<strong>", "</strong>");
                        console.log(results)
                        words = results
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

                            let resultAzure = await request(optAzure);
                            //await zapytanie do azure
                            //return {azure,pons}
                            return { resultAzure };
                        }

                        async function findDb(wordDB) {
                            let docs = await Word.find({ word: wordDB })
                            return docs;
                        }

                        Promise.all(arrayOfPromises).then((result) => {
                            translate = result
                            console.log(translate)
                            for (var i = 0; i < translate.length; i++) {
                                promiseTranslated.push(findDb(translate[i].resultAzure[0].translations[0].text))
                            }


                        }).catch(function (err) {
                            console.log("ERROR", err)
                        }).then(function () {
                            Promise.all(promiseTranslated).then((result) => {

                                // translatedWords.push({ source: m.resultAzure[0].translations[0].text, target: m.resultAzure[0].translations[1].text })
                                for (var x = 0; x < result.length; x++) {
                                    for (var m = 0; m < translate.length; m++) {
                                        let docs = result[x]
                                        let translated = translate[m]
                                        if (docs.length > 0) {
                                            var joinedWord = `${docs[0].article} ${docs[0].word}`
                                            translatedWords.push({ source: joinedWord, target: translated.resultAzure[0].translations[1].text, ready: `${joinedWord} - ${translated.resultAzure[0].translations[1].text.toLowerCase()}` })
                                        } else {
                                            translatedWords.push({ source: translated.resultAzure[0].translations[0].text, target: translated.resultAzure[0].translations[1].text, ready: `${translated.resultAzure[0].translations[0].text} - ${translated.resultAzure[0].translations[1].text.toLowerCase()}` })
                                        }

                                        if (translatedWords.length == translate.length) {
                                            console.log("GITTTT______________________________________")
                                            var context = ""
                                            var count = 0;
                                            for (var e = 0; e < translatedWords.length; e++) {
                                                context += (`${translatedWords[e].ready}\r\n`)
                                                count += 1
                                            }
                                            console.log(context)
                                            if (count == translatedWords.length) {
                                                var docx = officegen({
                                                    'type': 'docx',
                                                    'subject': 'testing it',
                                                    'keywords': 'some keywords',
                                                    'description': 'a description',
                                                    'pageMargins': { top: 1000, left: 800, bottom: 1000, right: 800 }
                                                });
                                                table = [
                                                    [
                                                        {
                                                            "val": plainText,
                                                            "opts": {
                                                                "cellColWidth": 7461,
                                                                "b": false,
                                                                "sz": "20",
                                                                "shd": {
                                                                    "themeFill": "text1",
                                                                    "fill": "#ffffff",
                                                                    "themeFillTint": "0"
                                                                },
                                                                "fontFamily": "Times New Roman"
                                                            }
                                                        },
                                                        {
                                                            "val": context,
                                                            "opts": {
                                                                "cellColWidth": 2861,
                                                                "b": true,
                                                                "sz": "20",
                                                                "shd": {
                                                                    "themeFill": "text1",
                                                                    "fill": "#ffffff",
                                                                    "themeFillTint": "0"
                                                                },
                                                                "fontFamily": "Times New Roman"
                                                            }
                                                        }
                                                    ],
                                                ]

                                                var tableStyle = {
                                                    // tableColWidth: 4261,
                                                    tableSize: 14,
                                                    tableColor: "ada",
                                                    tableAlign: "left",
                                                    tableFontFamily: "Times New Roman",
                                                    borders: false,
                                                }

                                                docx.createTable(table, tableStyle);

                                                res.set({
                                                    "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                                                    'Content-disposition': 'attachment; filename=translated.docx'
                                                });
                                                docx.generate(res);
                                                translatedWords = []
                                                words = []
                                                translate = []
                                                table = []
                                            }
                                        }
                                    }
                                }
                            }).catch(function (err) {
                                console.log("ERROR", err)
                            })
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
