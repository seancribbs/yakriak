Function.prototype.bind = function(target){
    var func = this;
    return function(){ return func.apply(target, arguments); };
}

var YakRiak = function(){
    this.interval = 1000; // Polling interval: 1s (Use caution!)
    this.since = new Date().getTime() - (60 * 60 * 1000); // Scope to the last hour initially
    this.client = new RiakClient();
    this.bucket = new RiakBucket('messages', this.client);
    window.onunload = this.stop.bind(this);
};

YakRiak.prototype.poll = function(){
    var yakriak = this;
    this.bucket.
        map({"bucket":"yakmr", "key":"mapMessageSince", "arg":this.since}).
        reduce({"bucket":"yakmr", "key":"reduceSortTimestamp", "keep":true}).
        run(this._poll.bind(this));
};

YakRiak.prototype.initialPoll = function(){
    var yakriak = this;
    this.bucket.
        map({"bucket":"yakmr", "key":"mapMessageSince", "arg":this.since}).
        reduce({"bucket":"yakmr", "key":"reduceSortTimestamp"}).
        reduce({"bucket":"yakmr", "key":"reduceLimitLastN", "arg":25, "keep":true}).
        run(this._poll.bind(this));
}

YakRiak.prototype._poll = function(successful, data, request){
    var yakriak = this;
    if(successful){
        var last_item = data[data.length - 1];
        if(last_item && last_item.timestamp)
            this.since = last_item.timestamp + 0.01; // Try to avoid duplicates on next poll
        data.forEach(this.displayMessage.bind(this));
    }
    this.pollingTimeout = setTimeout(function(){ yakriak.poll(); }, this.randomInterval());
};

// Should help prevent dogpile effects
YakRiak.prototype.randomInterval = function(){
    return Math.round((Math.random()-0.5)*this.interval/2 + this.interval);
};

YakRiak.prototype.displayMessage = function(item){
    if($('#' + item.key).length == 0){
        var elem = $('<li id="' + item.key + '" />');
        var avatar = $('<img />').attr('src', 'http://gravatar.com/avatar/' + item.gravatar + '?s=40');
        var name = $('<span class="name">').html(item.name);
        var message = $('<span class="message">').html(item.message);
        var timestamp = $('<span class="timestamp">').text(new Date(item.timestamp).toLocaleTimeString());
        elem.append(timestamp).append(avatar).append(name).append(message);
        if(item.name == this.name && item.gravatar == this.gravatar)
            elem.addClass('me');
        $('ol#chatlog').append(elem);
        $('ol#chatlog').scrollTop(elem.position().top);
    }
}

YakRiak.prototype.postMessage = function(message){
    var yakriak = this;
    message = $.trim(message);
    if(message.length > 0){
        var key = hex_md5(this.client.clientId + new Date().toString());
        var object = new RiakObject('messages', key, this.client, undefined, 'application/json');
        object.body = {
            'key': key,
            'message': this.escape(message),
            'name': this.escape(this.name),
            'gravatar': this.gravatar,
            'timestamp': new Date().getTime()
        };
        object.store(function(){ yakriak.displayMessage(object.body) });
    }
    $('form#chatbox').get(0).reset();
};

YakRiak.prototype.escape = function(string){
    return string.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

YakRiak.prototype.start = function(name, email){
    this.name = name;
    this.gravatar = (email && email.indexOf('@') != -1) ? hex_md5(email) : email;
    if($.trim(this.name).length != 0){
        if(Cookie.accept()){
            Cookie.set('yakriak.name', this.name, 4);
            Cookie.set('yakriak.gravatar', this.gravatar, 4);
        }
        $('form#login').hide();
        $('ol#chatlog, form#chatbox').show();
        this.initialPoll();
    } else {
        alert("Please enter a name for yourself. An email would be nice too (not sent over the wire).");
    }
};

YakRiak.prototype.stop = function(){
    clearTimeout(this.pollingTimeout);
};

(function($){
     $(function(){
           var yakriak = new YakRiak();
           if(Cookie.accept()){
               var name = Cookie.get('yakriak.name');
               var gravatar = Cookie.get('yakriak.gravatar');
               if(name)
                   yakriak.start(name, gravatar);
           }
           $('form#login').submit(function(e){
                                      e.preventDefault();
                                      yakriak.start($('#name').val(), $('#email').val());
                                      return false;
                                  });
           $('form#chatbox').submit(function(e){
                                        e.preventDefault();
                                        yakriak.postMessage($('#message').val());
                                    });
       });
 })(jQuery);
