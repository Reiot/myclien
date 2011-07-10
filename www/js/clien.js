/*jslint devel:true, evil:true, forin:true, type:true */
/*global console:false, window:false, jQuery:false, $:false, _:false, Backbone:false */

if (!window.console) {
    window.console = {log: function() {}}; 
}

//text = text.replace(/\<iframe(.+?)\<\/iframe\>/i, "");
function findTag(html, tag){    
    var re = new RegExp('<'+tag + '(.+?)' + '</'+tag+'>', 'g');    
    console.log( html.match(re));
}
function removeTag(html, tag){    
    var re = new RegExp('<'+tag + '(.+?)' + '</'+tag+'>', 'g');    
    return html.replace(re,'');
}
function removeImgSrc(html){
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
        return this.collection.url() +'&wr_id=' + this.id;
    },    
    initialize: function(){
        this.comments = new Comments(this.attributes.comments);
    }
});

var PostList = Backbone.Collection.extend({ 
    model: Post,
    parse: function(response){
        var posts = [];
        //findTag(response,'iframe');
        //findTag(response,'script');
        response = removeTag(response,'iframe');
        response = removeTag(response,'script');
        //findTag(response,'iframe');
        //findTag(response,'script');
        response = removeImgSrc(response);
        
        var $response = $(response);
        
        var $tr = $response.find('div.board_main tr');
        //console.log($tr.length,'post found');
        $tr.each(function(index){
            if(index<2){ return; } // skip notice post
            //console.log('#'+index);
            var $post = $(this);
            var post_id = $post.find('td').eq(0).text();
            //console.log('post_id='+post_id);
            var $post_subject = $post.find('td.post_subject');
            var post_subject;
            if( $post_subject.find('a').length ){
                //console.log('subject='+$post_subject.find('a').text());
                post_subject = $post_subject.find('a').text();
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

var boards = new Boards([
   {id:'park', title: '모두의 공원'},
   {id:'cm_iphonien', title: '아이포니앙'}
]);

var $boardList = $('#home ul.boards');
boards.each(function(board){
    console.log('toJSON',board.toJSON());
    var $tmpl = $('#board-list-tmpl').tmpl(board);
    console.log($tmpl);
    $tmpl.appendTo($boardList);
    
    var $pageTmpl = $('#board-page-tmpl').tmpl(board.toJSON());
    console.log($pageTmpl);
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
    
$('div.board ul.posts li a').live('tap', function(event, ui){
    console.log('before show post');
    // create empty post page if not exist
    var $anchor = $(this);
    var postID = $anchor.data('postID');
    var boardID = $anchor.data('boardID');
    console.log('board', boardID, 'post', postID, $anchor.attr('href'));
    
    // if($( $anchor.attr('href') ).length === 0){
    //     var $pageTmpl = $('#post-page-tmpl').tmpl({
    //         board: { id: boardID },
    //         post: { id: postID }
    //     });
    //     console.log($pageTmpl);
    //     $pageTmpl.appendTo('body').page();
    // }
});

$('div.post').live('pageshow', function(event, ui){
    console.log('post.pageshow');

    // $.mobile.showPageLoadingMsg();
    // 
    // var $page = $(this);
    // var board = boards.get( $page.attr('id') );        
    // console.log(board.url(), board.posts.url);
    // post.fetch()
    //     .success(function(){
    //     })
    //     .complete(function(){
    //         $.mobile.hidePageLoadingMsg();
    //     });    
});

}(jQuery,window));