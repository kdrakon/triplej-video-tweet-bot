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
  * Node Imports
  */
var ntwitter = require('ntwitter');
var twitter; //global handle to ntwitter
var $ = require('jquery');

/**
 * Constants
 */
//twitter keys go here


var YOUTUBE_REST_SEARCH = 'https://gdata.youtube.com/feeds/api/videos?q=[_QUERY]&orderby=relevance&max-results=1&alt=json&v=2';
var YOUTUBE_REST_TIMEOUT = 60000;
var TWITTER_STREAM_RECONNECT_TIMEOUT = 30000;

var TWEET_INTROS = [
    "Here's a video for that last song...",
    "And here's another one...",
    "You can play this video if you just missed that last song...",
    "Wanna listen & watch again?",
    "Let's play it again...",
    "Here you go..."
];

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

        var time = new Date(); var hour = time.getHours(); var minute = time.getMinutes();
        console.log("Connected to Twitter stream...[".concat(hour).concat(":").concat(minute).concat("]"));
        
        // event handler for when new tweets have arrived
        stream.on('data', function (data) {
            handleTweet(data);
        });
           
        // log disconnections
        stream.on('end', function (response) {
            var time = new Date(); var hour = time.getHours(); var minute = time.getMinutes();
            console.log("I was disconnected [".concat(hour).concat(":").concat(minute).concat("]"));
            stream.destroy();
        });
        stream.on('destroy', function (response) {
            var time = new Date(); var hour = time.getHours(); var minute = time.getMinutes();
            console.log("I was disconnected [".concat(hour).concat(":").concat(minute).concat("]"));
            stream.destroy();
        });
      
    });

}

function handleTweet(tweet){
    
    // break if tweet is undefined
    if (tweet.text === undefined){
        return;
    }else if (tweet.user.screen_name == "jjj2Video"){
        // I just got streamed my own tweet, so "break"
        return;
    }

    // try to find the real name of the artist if a twitter handle is given
    var artist_handle = tweet.text.match(/\.@.+?\s{1}/);
    if (artist_handle !== null){
        
        // perform twitter lookup
        twitter.showUser(artist_handle[0].replace(".@", ""), function(err, data){
            // take the first indexed result as the "right" user, if it exists
            if (data !== undefined){
                if (data[0].name !== undefined){
                    // save the artist name (cleaned up of "bad" characters)
                    var artist_name = data[0].name
                        .replace("&", " and ");
                    // query the song with the artists real name
                    querySong(tweet, artist_name);
                }else{
                    // for some reason, the artists name was not found, so im going to default to a simple query
                    querySong(tweet);
                }
            }
        });
        
    } else {
        // just query the song using what i've got
        querySong(tweet);
    }
}

/*
 * Lookup the recently retrieved tweet on Youtube
 */
function querySong(tweet, realname){
    
    // replace some things in the tweet to make the query better and split it into the artist and song title
    // query_elements[0] = artist, query_elements[1] = song title
    var query_elements = tweet.text
        .replace("&", " and ")
        .replace(/\[.+?\]/, "")
        .replace(/\{.+?\}/, "")
        .split(" - ");
    
    // change the name to a real name *if* it was given
    if (realname !== undefined){
        query_elements[0] = realname;
    }
    
    // construct the query
    var query = '"'.concat(encodeURIComponent(query_elements[0])).concat('"+"').concat(encodeURIComponent(query_elements[1])).concat('"');
    
    // setup the youtube REST query
    var youtube_query = YOUTUBE_REST_SEARCH.replace("[_QUERY]", query);
    
    // use AJAX to get the JSON query result from Youtube
    $.ajax({
        url: youtube_query,
        type: 'GET',
        success: function(data, textStatus, jqXHR){
            tweetResult(data, tweet);
        },
        error: function(jqXHR, textStatus, errorThrown){
            console.log("YOUTUBE REST ERROR: " + textStatus + "\n" + errorThrown);  
        },
        timeout: YOUTUBE_REST_TIMEOUT
    });
    
}

/*
 * Will take the query result from Youtube and turn it into a tweet and post it
 */
function tweetResult(youtubeResult, originalTweet){
    
    // break if the query is empty
    if (youtubeResult.feed.entry === undefined){
        return;
    }
    
    // the link to the video is under .feed.entry[0].link[0].href
    var youtube_link = youtubeResult.feed.entry[0].link[0].href;
    
    var intro = TWEET_INTROS[Math.floor(Math.random()*TWEET_INTROS.length)];
    
    // tweet the video result
    var newTweet = ".@".concat(originalTweet.user.screen_name).concat(" ").concat(intro).concat(" ").concat(youtube_link);
    
    console.log("I would have tweeted this: " + newTweet);    
    //twitter.updateStatus(newTweet, {'in_reply_to_status_id' : originalTweet.id_str}, function(err, data){            
            //// check if there was an error
            //if (err !== null){
                //console.log("ERROR TWEETING:\n");
                //console.log(data);
            //}
    //});    
    
}


/**
 * Node Main
 */

// start the main loop
startStreamWatch();
 
