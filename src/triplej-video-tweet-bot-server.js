/*
 * triplej-video-tweet-bot-server.js
 * 
 * About: a twitter bot that will follow the tweets of @triplejplays, do a query at youtube to
 * find a video for the tweet, and then tweet a link to the video.
 * 
 * Copyright 2012 Sean Policarpio
 * 
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston,
 * MA 02110-1301, USA.
 * 
 * 
 */

/**
 * Constants
 */
C_KEY = '';
C_SECRET_KEY = '';
AT_KEY = '';
AT_SECRET_KEY = '';

YOUTUBE_REST_SEARCH = 'https://gdata.youtube.com/feeds/api/videos?q=[_QUERY]&orderby=relevance&max-results=1&v=2&alt=json';

 /**
  * Node Imports
  */
var ntwitter = require('ntwitter');
var twitter; //global handle to ntwitter
var $ = require('jquery');

/**
 * Methods
 */
 
/*
 * Using ntwitter, will open a connection to Twitters Stream API for the authenticated user
 */
function startStreamWatch(){

    // create the ntwitter instance and fill out the OAuth and access credentials
    twitter = new ntwitter({
        consumer_key: C_KEY,
        consumer_secret: C_SECRET_KEY,
        access_token_key: AT_KEY,
        access_token_secret: AT_SECRET_KEY
    });

    // open a synchronous connection the Twitter Streams API: we will watch all the followers of the user this bot represents
    twitter.stream('user', {with:'followings'}, function(stream) {
        
        // event handler for when new tweets have arrived
        stream.on('data', function (data) {
            console.log("Got tweet...");
            handleTweet(data);
        });
                
        stream.on('end', function (response) {
            // try to restart after being disconnected from twitter
            console.log("I was disconnected, so I'm going to try to connect again...");
            setTimeout(startStreamWatch(), 30000);
        });
        stream.on('destroy', function (response) {
            // try to restart after a 'silent' disconnection from Twitter
            console.log("I was disconnected, so I'm going to try to connect again...");
            setTimeout(startStreamWatch(), 30000);
        });
      
    });

}

/*
 * Handle the recently retrieved tweet
 */
function handleTweet(tweet){
    
    if (tweet.text == undefined){
        return;
    }
    
    // first strip any "bad" characters from the tweet that can hinder the youtube query (e.g. '@')
    var query = encodeURIComponent(tweet.text
        .replace("@", "")
        .replace(".", "")
        .replace("-", " ")
        .replace(/\[.+?\]/, "")
        .replace("{", ")")
        .replace("}", ")")
    );
    
    // TODO instead of dropping the twitter @, do a lookup using the Twitter api to find the users "name" mentioned in the tweet
    
    // setup the youtube REST query
    var youtube_query = YOUTUBE_REST_SEARCH.replace("[_QUERY]", query);
    
    // use AJAX to get the JSON query result
    $.ajax({
        url: youtube_query,
        type: 'GET',
        success: function(data, textStatus, jqXHR){
            tweetResult(data, tweet);
        },
        error: function(jqXHR, textStatus, errorThrown){
            console.log("ERROR: " + textStatus + "\n" + errorThrown);  
        },
        timeout: 60000
    });
    
}

/*
 * Will take the query result from Youtube and turn it into a tweet and post it
 */
function tweetResult(youtubeResult, originalTweet){
    
    // break if the query is empty
    if (youtubeResult.feed.entry == undefined){
        console.log("but the Youtube result is empty.");
        return;
    }
    
    // the link to the video is under .feed.entry[0].link[0].href
    var youtube_link = youtubeResult.feed.entry[0].link[0].href;
    
    // tweet the video result
    var newTweet = ".@".concat(originalTweet.user.screen_name).concat(" ").concat(youtube_link);
    twitter.updateStatus(newTweet, {'in_reply_to_status_id' : originalTweet.id_str}, function(err, data){
            
            // check if there was an error
            if (err !== null){
                console.log("ERROR TWEETING:\n");
                console.log(data);
            }else{
                console.log("and I tweeted a video.");
            }
    });    
    
}


/**
 * Node Main
 */
 
startStreamWatch();
 
