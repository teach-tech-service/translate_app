var express = require("express")
var app = express()
const PORT = 3000;
var hbs = require('express-handlebars');
const docx = require("docx")
var path = require("path")
const { Document, Paragraph, Packer } = docx;

app.use(express.static('static'))
app.set('views', path.join(__dirname, 'views'));
app.engine('hbs', hbs({ defaultLayout: 'main.hbs' }));
app.set('view engine', 'hbs');

app.get("/", async function (req, res) {
    const doc = new Document();

    const paragraph = new Paragraph("Hello World");

    doc.addParagraph(paragraph);
    const packer = new Packer();

    const b64string = await packer.toBase64String(doc);
    res.setHeader('Content-Disposition', 'attachment; filename=My Document.docx');
    res.send(Buffer.from(b64string, 'base64'));
})

app.listen(PORT, function () {
    console.log("start serwera na porcie " + PORT)
})
