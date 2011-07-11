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

function parseAuthorImg(tag){
    var $img = tag.find("img");
    var author;
    if($img.length){
        author = $img.attr('src');
        author = "http://clien.career.co.kr/cs2" + author.replace("..","");
    }else{
        author = tag.find("span");
    }
    return author;
}

function parsePostID(anchor){
    return (/wr_id=(\d+)/).match(anchor['href'])[1];
}

function parsePostInfo(tag){
    var postID = parsePostID(tag.find("a"));
    console.log('id',postID);

    var title = tag.find("a");
    console.log('title',title);

    var commentCount = tag.find("span").text();
    commentCount = commentCount.replace(/\[\]/g,'');
    console.log('comments', commentCount);

    return {
        id: postID,
        title: title,
        commentCount: commentCount
    };
}
    
function parseComment(tag){
    var author = parseAuthorImg(tag.find("ul li"));
    console.log('author', author);
    
    var info_li = tag.find("ul li").eq(1).text();
    console.log(info_li);
    var info = info_li.replace(/()/g,"");
    
    var div_content = tag.nextSibling('div');
    var content = div_content.text().strip();
    console.log('content', content);
    
    return {
      author: author,
      info: info,
      content: content
    };
}

function parseContent(tag, removeComment){

    // tag.find("img").each(function(){
    //     
    //     if img['src'].startswith(".."):
    //         img['src'] = "http://clien.career.co.kr/cs2" + img['src'].replace("..","")
    //     elif img['src'].startswith("/cs2"):
    //         img['src'] = "http://clien.career.co.kr" + img['src']
    //     del img['onclick']
    //     del img['style']
    //     
    // });

    tag.find('script, form, textarea, input, div.ccl').remove();

    if (removeComment){
        tag.find('div.reply_head, div.reply_content').remove();
    }
        
    var $sigDiv = tag.find('div.signature');
    var sig;
    if ($sigDiv.length){
        sig = $sigDiv.find("dl dd").text();
        $sigDiv.remove();
    }

    return [tag.html(), sig];
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
        response = removeTag(response,'iframe');
        response = removeTag(response,'script');
        response = removeImgSrc(response);
        
        var $response = $(response);
        
        var $viewHead = $response.find('div.view_head');
        var author = parseAuthorImg($viewHead.find("p.user_info"));
        console.log("author", author);

        var info = $viewHead.find("p.post_info").text();
        console.log("info",info);
        
        var title = $response.find('div.view_title div h4 span');
        console.log('title', title);

        var content = parseContent($response.find('div.resContents'));
        
        var comments = [];
        $response.find('div.reply_head').each(function(){
            comments.push(parseComment($(this)));
        });

        var $viewBoard = $response.find('table.view_board');
        var $postSubject = $viewBoard.find('td.post_subject');
        var next, prev;
        if($postSubject.length === 1){
            prev = null;
            next = parsePostInfo($postSubject[0]);
        }else{
            prev = parsePostInfo($postSubject[0]);
            next = parsePostInfo($postSubject[1]);
        }

        console.log("prev", prev, "next", next);
        
        return {
            author: author,
            info: info,
            title: title,
            content: content,
            comments: comments,
            prev: prev,
            next: next            
        };
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

$.mobile.ajaxEnabled = false;

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
    
// FIXME called after a.click()
$('div.board ul.posts li a').live('tap', function(event, ui){
    console.log('before show post');
    // create empty post page if not exist
    var $anchor = $(this);
    var postID = $anchor.data('postID');
    var boardID = $anchor.data('boardID');
    console.log('board', boardID, 'post', postID, $anchor.attr('href'));
    
    if($( $anchor.attr('href') ).length === 0){
        var $pageTmpl = $('#post-page-tmpl').tmpl({
            board: { id: boardID },
            post: { id: postID }
        });
        console.log($pageTmpl);
        $pageTmpl.appendTo('body').page();
    }
});

$('div.post').live('pageshow', function(event, ui){
    console.log('post.pageshow');

    $.mobile.showPageLoadingMsg();

    var $page = $(this);
    var board = boards.get( $page.data('boardID') );   
    if(!board){
        throw "board not found";
    }     
    
    console.log(board.url(), board.posts.url);
    var post = board.posts.get( $page.data("postID") );
    if(!post){
        throw "post not found";
    }

    console.log('post url',post.url());
    
    post.fetch()
        .success(function(){
        })
        .complete(function(){
            $.mobile.hidePageLoadingMsg();
        });    
});

}(jQuery,window));