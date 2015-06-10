module.exports = {
    baseUrl : 'http://askoyfotballklubb.no',
    articleUrl : '/article.php?ArticleID=',
    videoUrl: '/link.php?LinkSequenceID=',
    lastArticle: 3683,
    articleRange: [1, 3683],
    videoRange: [1, 53],
    dest: 'public',
    sections: [
        {
            'name' : 'index',
            'url' : 'index.php',
        },
        {
            'name' : 'contact',
            'url' : 'contact.php',
        },
        {
            'name' : 'videoer',
            'url' : 'link.php?LinkSequenceID=33&KT_back=1&show_all_nav_listrsRecentVideos1=1',
        }
    ]
};
