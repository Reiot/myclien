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
                self.posts.each(function(post){
                    console.log(post.id, post.get('subject'));
                });
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

(function($, window){

var boards = new Boards([
   {id:'park', title: '모두의 공원'},
   {id:'cm_iphonien', title: '아이포니앙'}
]);

var $boardList = $('#home div.content ul[data-role="listview"]');
boards.each(function(board){
    console.log(board.toJSON());
    var $tmpl = $('#board-list-tmpl').tmpl(board.toJSON());
    console.log($tmpl);
    //$tmpl.appendTo($boardList);
});

var park = boards.get("park");        
console.log(park.url(), park.posts.url);
park.fetch()
    .success(function(){
        var $postList = $('#board div.content ul[data-role="listview"]');
        park.posts.each(function(post){
            console.log(post.id, post.get('subject'));
            $('#post-list-tmpl').tmpl(post.toJSON())
                .appendTo($postList);
        });
    });
    
// $('#park')
//     .live('pageshow', function(){
//      $.mobile.showPageLoadingMsg();
// 
//         var board = boards.get("park");        
//      console.log("#old posts=" + board.length);
//     });

}(jQuery,window));