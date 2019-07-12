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
const docx = require("docx")
var path = require("path")
const { Document, Paragraph, Packer } = docx;
var Word = require("./models/words")
var filename, textConverted, plainText;
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
                        console.log(text)
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

                            let resultAzure = await request(optAzure);
                            //await zapytanie do azure
                            //return {azure,pons}
                            return { resultAzure };
                        }
                        Promise.all(arrayOfPromises).then((result) => {

                            var translate = result

                            translate.map(m => {
                                console.log(m.resultAzure[0])
                                // translatedWords.push({ source: m.resultAzure[0].translations[0].text, target: m.resultAzure[0].translations[1].text })
                                Word.find({ word: m.resultAzure[0].translations[0].text }, function (err, docs) {
                                    console.log(docs)
                                    if (docs.length > 0) {
                                        console.log('KURDE')
                                        var joinedWord = `${docs[0].article} ${docs[0].word}`

                                        translatedWords.push({ source: joinedWord, target: m.resultAzure[0].translations[1].text })
                                        console.log(translatedWords, 'translated')
                                    } else {
                                        console.log('XD')
                                        translatedWords.push({ source: m.resultAzure[0].translations[0].text, target: m.resultAzure[0].translations[1].text })
                                        console.log(translatedWords, 'translated')
                                    }

                                    if (translatedWords.length == translate.length) {
                                        console.log("GITTTT______________________________________")
                                        console.log(translatedWords, 'translated')
                                        const elo = async function init() {
                                            const doc = new Document();
                                            translatedWords.map(w => {
                                                var paragraph = new Paragraph(w.source + " : " + w.target);

                                                doc.addParagraph(paragraph);
                                            })

                                            const packer = new Packer();

                                            const b64string = await packer.toBase64String(doc);
                                            res.setHeader('Content-Disposition', 'attachment; filename=My Document.docx');
                                            res.send(Buffer.from(b64string, 'base64'));
                                        }
                                        elo()
                                    }

                                });
                            })


                        }).catch(function (err) {
                            console.log("ERROR", err)
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
