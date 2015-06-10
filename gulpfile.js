"use strict";

let gulp = require('gulp');
let serialize = require('dom-serializer');
let utils = require('parse5-utils');
let config = require('./config/config.js');
let co = require('co');
let request = require('co-request');
let select = require('css-select');
let htmlparser = require('htmlparser2');
let domutils = htmlparser.DomUtils;
let mkdirp = require('mkdirp');
let fs = require('mz/fs');
let path = require('path');
let iconv = require('iconv');

gulp.task('default', function() {

    let lower = config.articleRange[0];
    let upper = config.articleRange[1];

    (function delay() {
        setTimeout(function() {
            downloadPage(upper);
            upper--;
            if (upper > lower -1) {
                delay();
            }
        }, 200);
    }());

});


function downloadPage(artNum) {
    co(function* () {

        //let artNum = 3650;

        let url = config.baseUrl + config.articleUrl + artNum;

        let result = yield request({ encoding: 'binary', uri: url });

        // fix encoding
        let body = new Buffer(result.body, 'binary');
        let conv = new iconv.Iconv('windows-1252', 'utf8');
        body = conv.convert(body).toString();


        fs.writeFile(path.join(config.dest, 'articles', artNum + '.html'), body);


        // fetch images used in article

        let dom = htmlparser.parseDOM(body);

        let imgs = select('img', dom);

        let urls = imgs.map(function(img) {
            return img.attribs.src;
        });

        urls = urls.filter(function(url) {
            return url.split('/')[1] === 'upload';
        });

        if (urls.length > 0) {
            for (let url of urls) {
                downloadImage(config.baseUrl + url);
            }
        }

    });
}

function downloadImage(url) {
    co(function* () {

        let dirname = path.dirname(url).replace(config.baseUrl, '');
        let filename = path.basename(url);

        let dest = path.join(config.dest, dirname);

        mkdirp(dest);

        let result = yield request(url);

        try {
            fs.writeFile(path.join(dest, filename), result.body);
        } catch(e) {
            console.log('error', e);
        }

    });
}


// build markdown file for use in Jekyll
gulp.task('convertToMarkdown', function() {
    co(function* () {

        let result = yield request(config.baseUrl + config.articleUrl + 500);

        let dom = htmlparser.parseDOM(result.body);

        let content = select('.contentBodyContainer', dom);

        let removeElems = [
            select('#Accordion2', content)[0],
            select('script', content)[0],
            select('h1', content)[1]
        ];

        for (let elem of removeElems) {
            domutils.removeElement(elem);
        }

        let signature = select('.signature', content)[0].children[0].data.split(', ');

        let frontmatter = {
            title : select('h1', content)[0].children[0].data,
            author : signature[0],
            date : signature[1]
        };


        console.log(frontmatter);

    });
});
