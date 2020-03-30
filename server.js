const express = require('express');
const path = require('path');
const queryProcessor = require('./query_processing/queryProcessor.js');
const bodyParser = require('body-parser');

const PORT = 3000;

const app = express();

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
})

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.get('/', function(req, res) {
    res.render('index', {
        title: "Databáze telefonů",
    })
})

app.get('/search', function(req, res) {

    res.sendFile(path.join(__dirname+'/search.html'));

});

app.get('/search-fulltext-results', function(req, res) {
    let searchString = req.query.searchString;
    let page = null;
    if (req.query.page) {
        page = parseInt(req.query.page)
    }

    //remove page from url
    let regex = new RegExp(/&page=\d+/g);
    let url = req.originalUrl.replace(regex, "");

    queryProcessor.queryFulltext(searchString, page, res, url);
});


app.get('/search-results', function(req, res) {

    let parameters = {
        vyrobce : req.query.vyrobce,
        konstrukce: req.query.konstrukce,
        ram: req.query.ram,
        OS: req.query.OS,
        bluetooth: req.query.bluetooth,
        fotoaparat_mpix: req.query.fotoaparat_mpix,
        uzivatelska_pamet: req.query.uzivatelska_pamet,
    }

    Object.keys(parameters).forEach(key => parameters[key] === undefined ? delete parameters[key] : '');

    if(!req.query.page) {
        page = 1
    } else {
        parameters.page = parseInt(req.query.page)
    }

    //remove page from url
    let regex = new RegExp(/&page=\d+/g);
    let url = req.originalUrl.replace(regex, "");

    queryProcessor.query(parameters, res, url);
});

app.get('/count', function(req, res) {

    let parameters = {
        vyrobce : req.query.vyrobce,
        konstrukce: req.query.konstrukce,
        ram: req.query.ram,
        OS: req.query.OS,
        bluetooth: req.query.bluetooth,
        fotoaparat_mpix: req.query.fotoaparat_mpix,
        uzivatelska_pamet: req.query.uzivatelska_pamet
    }

    Object.keys(parameters).forEach(key => parameters[key] === undefined ? delete parameters[key] : '');
    //Object.keys(parameters).forEach(key => parameters[key] === '%' ? delete parameters[key] : '');

    queryProcessor.queryCount(parameters, res, req.originalUrl);

});