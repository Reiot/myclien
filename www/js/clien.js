/*jslint devel:true, evil:true, forin:true, type:true */
/*global console:false, window:false, jQuery:false, $:false, Backbone:false */

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

var Posts = Backbone.Collection.extend({ 
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
        
        //response = removeIFrame(response);
        var $response = $(response);
        $response
            //.find('iframe, script').remove().end()
            .find('#header').remove().end()
            .find('#aside').remove().end()
            .find('img').attr('src','');
        // $('img', response).each(function(){
        //     var $img = $(this);
        //     var src = $img.attr('src');
        //     var newSrc;
        //     if(src[0]==="/"){
        //         newSrc = 'http://clien.career.co.kr' + src;
        //     }else if(src.length>2 && src[0]==="." && src[1]==="."){
        //         newSrc = 'http://clien.career.co.kr/cs2' + src.slice(2);
        //     }else{
        //         console.warn(src);
        //     }
        //     console.log('img.src', src, newSrc);
        //     $img.attr('src', newSrc);
        // });
        
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
        this.posts = new Posts();
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

var boards = new Boards([
   {id:'park', title: '모두의 공원'},
   {id:'cm_iphonien', title: '아이포니앙'}
]);

var park = boards.get("park");        
console.log(park.url(), park.posts.url);
park.fetch()
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