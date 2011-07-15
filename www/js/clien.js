/*jslint devel:true, evil:true, forin:true, type:true */
/*global console:false, window:false, jQuery:false, $:false, _:false, Backbone:false */

if (!window.console) {
    window.console = {log: function() {}}; 
}

$('div').live('pagebeforecreate beforecreate', function(event){
    var $page = $(this);
    console.warn('pagebeforecreate', $page);
});

function removeTag(html, tag){    
    var re = new RegExp('<'+tag + '.+?' + '</'+tag+'>', 'gi');    
    return html.replace(re,'');
}
function replaceImgSrc(html){
    // return html.replace(/<img([^>]*)\ssrc=['"][^'"]+['"]/gi,
    //         '<img$1 data-src=""');    
    
    return html.replace(/<img([^>]*)\ssrc=/gi,
        '<img$1 data-src=');    
}



// Comment
var Comment = Backbone.Model.extend({ 
    
});
var Comments = Backbone.Collection.extend({
   model: Comment 
});

// Post
var Post = Backbone.Model.extend({ 
    url: function(){
        return this.collection.url + '&wr_id=' + this.id;
    },    
    initialize: function(){
        this.comments = new Comments(this.attributes.comments);
    },
    parse: function(response){
        var self = this;
        
        response = removeTag(response,'iframe');
        response = removeTag(response,'script');
        response = replaceImgSrc(response);
        
        var $response = $(response);
        
        var $viewHead = $response.find('div.view_head');
        var author = self.parseUserInfo( $viewHead.find("p.user_info") );
        console.log("author", author);

        var info = $viewHead.find("p.post_info").text().trim();
        var match = /(\d\d\d\d-\d\d-\d\d \d\d:\d\d)\s+,\s+Hit\s:\s(\d+)\s+,\s+Vote\s+:\s+(\d+)/.exec(info);    
        var date, hit = 0, vote = 0;
        if(match){
            date = match[1];
            hit = match[2];
            vote = match[3];
        }
        console.log(date,hit,vote);
        
        var subject = $response.find('div.view_title div h4 span').text().trim();
        console.log('subject', subject);

        var $content = $response.find('div.resContents span');
        console.log('post.content', $content.html());

        var signature = $response.find('div.signature dl dd').text().trim();
        console.log('post.signature', signature);
        
        var comments = [];
        $response.find('div.reply_head').each(function(){
            comments.push( self.parseComment($(this)) );
        });

        var $viewBoard = $response.find('table.view_board');
        var $postSubject = $viewBoard.find('td.post_subject');
        var next, prev;
        if($postSubject.length === 1){
            prev = null;
            next = self.parsePostSubject($postSubject.eq(0));
        }else{
            prev = self.parsePostSubject($postSubject.eq(0));
            next = self.parsePostSubject($postSubject.eq(1));
        }

        console.log("prev", prev, "next", next);
        
        return {
            author: author,
            date: date,
            hit: hit,
            vote: vote,
            subject: subject,
            content: $content.html(),
            signature: signature,
            comments: comments,
            prev: prev,
            next: next            
        };
    },
    
    parseUserInfo: function(tag){
        var author;
        var $img = tag.find("img");
        if($img.length){
            author = "http://clien.career.co.kr/cs2" + $img.data('src').replace("..","");
        }else{
            author = tag.find("span").text().trim();
        }
        return author;
    },
    
    parsePostSubject: function( $subject ){
        return {
            id: $subject.find("a").attr('href')
                    .match(/wr_id=(\d+)/)[1],
            subject: $subject.find("a").text().trim(),
            commentCount: $subject.find("span").text().trim()
                            .replace(/[\[\]]/g,'')
        };
    },
    
    parseComment: function($comment){
        var self = this;
        return {
            author: self.parseUserInfo( $comment.find("ul li") ),
            date: $comment.find("ul li").eq(1)
                    .text().trim().replace(/[()]/g,""),
            content: $comment.next('div').text().trim()
        };
    }
});

var PostList = Backbone.Collection.extend({ 
    model: Post,
    parse: function(response){
        var posts = [];
        response = removeTag(response,'iframe');
        response = removeTag(response,'script');
        response = replaceImgSrc(response);
        
        var $response = $(response);
        
        var $tr = $response.find('div.board_main tr');
        //console.log($tr.length,'post found');
        $tr.each(function(index){
            if(index<2){ return; } // skip notice post
            //console.log('#'+index);
            var $post = $(this);
            var post_id = $post.find('td').eq(0).text().trim();
            //console.log('post_id='+post_id);
            var $post_subject = $post.find('td.post_subject');
            var post_subject;
            if( $post_subject.find('a').length ){
                //console.log('subject='+$post_subject.find('a').text());
                post_subject = $post_subject.find('a').text().trim();
            }else{
                console.warn('blocked post');
                return;
            }
            posts.push({
                id: post_id,
                subject: post_subject 
            });
            //$('body').append($response);
        });
        return posts;
    }
});

var Board = Backbone.Model.extend({ 
    url: function(){
        return 'http://clien.career.co.kr/cs2/bbs/board.php?bo_table=' + this.id;
    },    
    initialize: function(){
        this.posts = new PostList();
        this.posts.board = this;
        this.posts.url = this.url();
    },
    fetch: function(){
        var self = this;
        return self.posts.fetch({
                error: function(err){
                    console.error('something wrong',err);
                },
                dataType:'html'
            })
            .success(function(){
                // self.posts.each(function(post){
                //     console.log(post.id, post.get('subject'));
                // });
            })
            .error(function(a,b,c){
                console.error(a,b,c);
            });
    }
});

// Board
var Boards = Backbone.Collection.extend({
    model: Board
});

// TODO
// create page per post as "#board.id-post.id" before transition
(function($, window){

$.mobile.ajaxEnabled = false;

var boards = new Boards([
   {id:'park', title: '모두의 공원'},
   {id:'cm_iphonien', title: '아이포니앙'}
]);

var $boardList = $('#home ul.boards');
boards.each(function(board){
    //console.log('toJSON',board.toJSON());
    var $tmpl = $('#board-list-tmpl').tmpl(board);
    //console.log($tmpl);
    $tmpl.appendTo($boardList);
    
    var $pageTmpl = $('#board-page-tmpl').tmpl(board.toJSON());
    //console.log($pageTmpl);
    $pageTmpl.appendTo('body');
});

$('div.board').live('pageshow', function(event, ui){
    console.log('board.pageshow');

    $.mobile.showPageLoadingMsg();
    
    var $page = $(this);
    var $postList = $page.find('ul.posts');
    var board = boards.get( $page.attr('id') );        
    console.log(board.url(), board.posts.url);
    board.fetch()
        .success(function(){
            board.posts.each(function(post){
                console.log(board.id, post.id, post.get('subject'));
                $('#post-list-tmpl').tmpl({
                    board: board,
                    post: post
                })
                .appendTo($postList);
            });
            $postList.listview('refresh');
        })
        .complete(function(){
            $.mobile.hidePageLoadingMsg();
        });
});
    
// FIXME called after a.click()
$('div.board ul.posts li a').live('tap', function(event, ui){
    console.log('before show post');
    // create empty post page if not exist
    var $anchor = $(this);
    var href = $anchor.attr('href');
    console.log('href',href);    
    if( $(href).length === 0 ){

        var postID = $anchor.data('postID');
        var boardID = $anchor.data('boardID');
        console.log('board', boardID, 'post', postID, $anchor.attr('href'));

        var board = boards.get( boardID );   
        if(!board){
            throw "board not found";
        }     

        var post = board.posts.get( postID );
        if(!post){
            throw "post not found";
        }

        console.log('post url',post.url());

        post.fetch({dataType:'html'})
            .success(function(){
                console.log( post.toJSON() );
                var $page = $('#post-page-tmpl').tmpl({
                    board: board,
                    post: post
                }).appendTo('body');
                //console.log($pageTmpl);
                $.mobile.changePage( $page );
            });

    }
    return false;
});
// 
// $('div.post').live('pageshow', function(event, ui){
//     console.log('post.pageshow');
// 
//     $.mobile.showPageLoadingMsg();
// 
//     var $page = $(this);
//     var board = boards.get( $page.data('boardID') );   
//     if(!board){
//         throw "board not found";
//     }     
//     
//     console.log(board.url(), board.posts.url);
//     var post = board.posts.get( $page.data("postID") );
//     if(!post){
//         throw "post not found";
//     }
// 
//     console.log('post url',post.url());
//     
//     post.fetch({dataType:'html'})
//         .success(function(){
//             console.log( post.toJSON() );
//             $page.find('div[data-role="header"]').html(post.get('subject'));
//             $page.find('div[data-role="content"]').html(post.get('content'));
//         })
//         .complete(function(){
//             $.mobile.hidePageLoadingMsg();
//         });    
// });



}(jQuery,window));