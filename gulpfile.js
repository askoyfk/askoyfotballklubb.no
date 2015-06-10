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

let articles = [];

gulp.task('default', function() {

    let lower = config.articleRange[0];
    let upper = config.articleRange[1];

    (function delay() {
        setTimeout(function() {
            downloadPage(upper);
            upper--;
            if (upper > lower -1) {
                delay();
            } else {
                fs.writeFile(path.join(config.dest, 'articles', 'articles.json'), JSON.stringify(articles, null, 4));
            }
        }, 100);
    }());

});



gulp.task('createImagesList', function() {

    let images = [];

    co(function* () {
        let articles = yield fs.readFile(path.join(config.dest, 'articles', 'articles.json'), 'utf8');

        articles = JSON.parse(articles);

        let articlesWithImages = articles.filter(function(article) {
            if (article.images) {
                return article;
            }
        });

        for (let article of articlesWithImages) {
            for (let image of article.images) {
                images.push(image);
            }
        }

    }).then(function() {
        fs.writeFile(path.join(config.dest, 'articles', 'images.json'), JSON.stringify(images, null, 4));
    });


});


gulp.task('downloadImages', function() {

    co(function* () {
        let imagesUrls = yield fs.readFile(path.join(config.dest, 'articles', 'images.json'), 'utf8');

        imagesUrls = JSON.parse(imagesUrls);

        (function download() {
            setTimeout(function() {
                downloadImage(imagesUrls.pop());
                if (imagesUrls.length > 0) {
                    console.log(imagesUrls.length);
                    download();
                }
            }, 100);
        }());
    });

});

function downloadPage(artNum) {
    co(function* () {

        // let artNum = 3650;

        let url = config.baseUrl + config.articleUrl + artNum;

        let result = yield request({ encoding: 'binary', uri: url });

        // fix encoding
        let body = new Buffer(result.body, 'binary');
        let conv = new iconv.Iconv('windows-1252', 'utf8');
        body = conv.convert(body).toString();

        let dom = htmlparser.parseDOM(body);



        let content = select('.contentBodyContainer', dom);


        let signature = select('.signature', content)[0].children[0].data.split(', ');


        let year = signature[1].split('.')[2];



        mkdirp(path.join(config.dest, 'articles', year));

        fs.writeFile(path.join(config.dest, 'articles', year, artNum + '.html'), body);

        // frontmatter
        let frontmatter = {
            id: artNum,
            title : select('h1', content)[0].children[0].data,
            author : signature[0],
            date : signature[1].split('.').reverse().join('-')
        };

        // fetch images used in article


        let imgs = select('img', dom);

        let urls = imgs.map(function(img) {
            return img.attribs.src;
        });

        urls = urls.filter(function(url) {
            return url.split('/')[1] === 'upload';
        });

        if (urls.length > 0) {

            frontmatter.images = [];

            for (let url of urls) {
                frontmatter.images.push(config.baseUrl + url);
                // downloadImage(config.baseUrl + url);
            }
        }

        articles.push(frontmatter);

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
gulp.task('convert', function(artNum) {
    co(function* () {

        let artNum = 500;

        let result = yield request(config.baseUrl + config.articleUrl + artNum);

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
            id: artNum,
            title : select('h1', content)[0].children[0].data,
            author : signature[0],
            date : signature[1].split('.').reverse().join('-')
        };

        console.log(frontmatter);

    });
});
