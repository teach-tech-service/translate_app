var express = require("express")
var app = express()
const PORT = 3000;
var path = require("path")
var hbs = require('express-handlebars');
const request = require('request');
var officegen = require('officegen');
var docx = officegen('docx');
var upload = require("express-fileupload");
var mammoth = require("mammoth");
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


app.get("/", function (req, res) {
    var elo = ["ich", "nein", "was"]
    elo.map(m => {
        request({
            uri: 'https://api.pons.com/v1/dictionary',
            headers: {
                'Content-type': 'application/x-www-form-urlencoded',
                "x-secret": "cd0132b6a2b33b6880d0b79dd1946a5456d00bc1b861cb1f281fea5f01313103",
            },
            qs: {
                q: m,
                in: "de",
                language: "de",
                l: "depl",
                ref: true,
                json: true,
            }
        }, (err, res, body) => {
            if (err) { return console.log(err); }
            var co = JSON.parse(body)

            co.map(c => {
                console.log(c.hits[0].roms[0].arabs[0].translations[0])
                //     c.hits.map(m => {
                //         m.roms.map(w => {
                //             w.arabs.map(s => {
                //                 console.log(s.translations[0].target)
                //                 //s.translations.map(k => console.log(k.target))

                //             })

                //         })
                //     })

            })


        });
    })


    // request({
    //     uri: 'https://api.pons.com/v1/dictionary',
    //     headers: {
    //         'Content-type': 'application/x-www-form-urlencoded',
    //         "x-secret": "cd0132b6a2b33b6880d0b79dd1946a5456d00bc1b861cb1f281fea5f01313103",
    //     },
    //     qs: {
    //         q: "ich",
    //         in: "de",
    //         language: "de",
    //         l: "depl",
    //         ref: true,
    //         json: true,
    //     }
    // })
    // console.log(res)
    //res.send(xd)
    //res.render("index")
})

app.post("/upload", function (req, res) {
    if (req.files) {
        console.log(req.files.upfile.name)
        filename = req.files.upfile.name
        var file = req.files.upfile

        file.mv("./upload/" + filename, function (err) {
            if (err) {
                console.log(err);
                res.send("error")
            } else {
                res.send("DONE")
                mammoth.convertToHtml({ path: "./upload/" + filename })
                    .then(function (result) {
                        textConverted = result.value; // The raw text
                        var messages = result.messages;
                        var results = getFromBetween.get(textConverted, "<strong>", "</strong>");
                        console.log(results)
                        results.map(m => {
                            translatedWords.push({ source: m, target: "" })
                        })
                        console.log(translatedWords)



                    })
                    .done();
            }
        })
    }
})

app.listen(PORT, function () {
    console.log("start serwera na porcie " + PORT)
})
