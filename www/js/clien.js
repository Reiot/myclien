/*jslint devel:true, evil:true, forin:true, type:true */
/*global console:false, window:false, jQuery:false, Backbone:false */

if (!window.console) {
    window.console = {log: function() {}}; 
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

var Posts = Backbone.Collection.extend({ 
    model: Post,
    parse: function(response){
        var posts = [];
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
        });
        return posts;
    }
});

var Board = Backbone.Model.extend({ 
    url: function(){
        return 'http://clien.career.co.kr/cs2/bbs/board.php?bo_table=' + this.id;
    },    
    initialize: function(){
        this.posts = new Posts();
        this.posts.url = this.url();
    }
});

// Board
var Boards = Backbone.Collection.extend({
    model: Board
});

var boards = new Boards([
   {id:'park', title: '모두의 공원'},
   {id:'cm_iphonien', title: '아이포니앙'}
]);

var park = boards.get("park");        
console.log(park.url(), park.posts.url);
park.posts.fetch({dataType:'html'})
    .success(function(){
        park.posts.each(function(post){
            console.log(post.id, post.get('subject'));
        });
    });

(function($, window){

$('#park')
    .live('pageshow', function(){
		$.mobile.showPageLoadingMsg();

        var board = boards.get("park");        
		console.log("#old posts=" + board.length);
    });

}(jQuery,window));