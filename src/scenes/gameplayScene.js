var GamePlayScene = function(game, stage)
{
  var self = this;
  var dc = stage.drawCanv;

  var location_size = 0.1;
  var quake_rate = 0.001;
  var n_locations = 3;
  var n_quakes = 1;

  var hoverer;
  var dragger;
  var clicker;

  var state;
  var ENUM = 0;
  var STATE_PLAY = ENUM; ENUM++;
  var STATE_PAUSE = ENUM; ENUM++;

  var earth;
  var highlit_loc;

  var scrubber;
  var play_button;
  var pause_button;
  var reset_button;

  self.ready = function()
  {
    hoverer = new PersistentHoverer({source:stage.dispCanv.canvas});
    dragger = new Dragger({source:stage.dispCanv.canvas});
    clicker = new Clicker({source:stage.dispCanv.canvas});

    state = STATE_PLAY;

    earth = new Earth();

    var l;
    for(var i = 0; i < n_locations; i++)
    {
      l = new Location(Math.random(),Math.random());
      hoverer.register(l);
      dragger.register(l);
      earth.registerLocation(l);
    }
    earth.reset();

    scrubber = new Scrubber(earth);

    play_button  = new ButtonBox(10,10,20,20,function(){state = STATE_PLAY;});
    pause_button = new ButtonBox(40,10,20,20,function(){state = STATE_PAUSE;});
    reset_button = new ButtonBox(dc.width-30,10,20,20,function(){earth.reset();});

    clicker.register(play_button);
    clicker.register(pause_button);
    clicker.register(reset_button);
    dragger.register(scrubber);
    clicker.register(scrubber);
    hoverer.register(earth);
    clicker.register(earth);
  };

  self.tick = function()
  {
    hoverer.flush();
    dragger.flush();
    clicker.flush();

    if(state == STATE_PLAY)
    {
      if(earth.t < earth.recordable_t) earth.t++;
    }
    earth.tick();
  };

  self.draw = function()
  {
    earth.draw();
    scrubber.draw();
    play_button.draw(dc);
    pause_button.draw(dc);
    reset_button.draw(dc);
  };

  self.cleanup = function()
  {
  };



//DATA

  var Earth = function()
  {
    var self = this;

    self.x = 0;
    self.y = 0;
    self.w = dc.width;
    self.h = dc.height;

    self.t = 0;
    self.recordable_t = 1.5/quake_rate;

    self.locations = [];
    self.quakes; //gets allocated on immediate reset
    self.ghost_quake;

    self.registerLocation = function(l)
    {
      self.locations.push(l);
    }

    self.reset = function()
    {
      self.t = 0;
      self.quakes = [];
      for(var i = 0; i < n_quakes; i++)
        self.quakes.push(new Quake(9999,9999,0));

      self.ghost_quake = new Quake(Math.random(),Math.random(),0);
      var l;
      for(var i = 0; i < self.locations.length; i++)
      {
        l = self.locations[i];
        q = self.ghost_quake;
        q.location_ts[i] = q.t+(wdist(l,q)/quake_rate);
      }
    }

    self.tick = function()
    {
    }

    self.click = function(evt)
    {
      if(evt.hit_ui) return; //only "hit" if unobtruded
      evt.hit_ui = true;
      self.t = 0;
      var q = new Quake(evt.doX/dc.width,evt.doY/dc.height,self.t);

      var l;
      for(var i = 0; i < self.locations.length; i++)
      {
        l = self.locations[i];
        q.location_ts[i] = q.t+(wdist(l,q)/quake_rate);
      }
      self.quakes.push(q);
      if(self.quakes.length > n_quakes) self.quakes.splice(0,1);
    }

    self.hovering = false;
    self.hoveringX = 0;
    self.hoveringY = 0;
    self.hovering_wx = 0;
    self.hovering_wy = 0;
    self.hover = function(evt)
    {
      self.hovering = true;
      self.hoveringX = evt.doX;
      self.hoveringY = evt.doY;
      self.hovering_wx = self.hoveringX/dc.width;
      self.hovering_wy = self.hoveringY/dc.height;
    }
    self.unhover = function()
    {
      self.hovering = false;
    }

    self.draw = function()
    {
      //draw distance viz
      var l;
      dc.context.strokeStyle = "rgba(0,0,0,0.2)";
      var mouse = { wx:self.hovering_wx, wy:self.hovering_wy };
      for(var i = 0; i < self.locations.length; i++)
      {
        l = self.locations[i];

        var x = l.wx-mouse.wx;
        var y = l.wy-mouse.wy;
        var d = Math.sqrt(x*x+y*y);

        dc.context.beginPath();
        //circles around mouse
        //dc.context.arc(mouse.wx*dc.width,mouse.wy*dc.height,d*dc.width,0,2*Math.PI);
        //dc.context.ellipse(mouse.wx*dc.width,mouse.wy*dc.height,d*dc.width,d*dc.height,0,0,2*Math.PI);

        //circles between mouse/location
        //dc.context.arc((mouse.wx+x/2)*dc.width,(mouse.wy+y/2)*dc.height,d/2*dc.width,0,2*Math.PI);
        //dc.context.ellipse((mouse.wx+x/2)*dc.width,(mouse.wy+y/2)*dc.height,d/2*dc.width,d/2*dc.height,0,0,2*Math.PI);

        //circles around locs
        //dc.context.arc(l.wx*dc.width,l.wy*dc.height,d*dc.width,0,2*Math.PI);
        dc.context.ellipse(l.wx*dc.width,l.wy*dc.height,d*dc.width,d*dc.height,0,0,2*Math.PI);

        //draw lines
        dc.context.moveTo(l.wx*dc.width,l.wy*dc.height);
        dc.context.lineTo(mouse.wx*dc.width,mouse.wy*dc.height);

        dc.context.stroke();

        //line annotations
        dc.context.fillStyle = "#000000";
        dc.context.font = "10px Helvetica";
        dc.context.textAlign = "right";
        dc.context.fillText("("+Math.round(d/quake_rate)+")",(mouse.wx+x/2)*dc.width,(mouse.wy+y/2)*dc.height);
      }

      //draw locations
      var l;
      dc.context.strokeStyle = "#000000";
      for(var i = 0; i < self.locations.length; i++)
      {
        l = self.locations[i];
        //dc.context.fillRect(l.x,l.y,l.w,l.h);
        dc.context.beginPath();
        dc.context.ellipse(l.wx*dc.width,l.wy*dc.height,location_size/2*dc.width,location_size/2*dc.height,0,0,2*Math.PI);
        dc.context.stroke();
        if(l == highlit_loc)
        {
          dc.context.fillStyle = "#000000";
          dc.context.font = "10px Helvetica";
          dc.context.textAlign = "right";
          dc.context.fillText("("+fviz(l.wx)+","+fviz(l.wy)+")",l.x,l.y-1);
        }
      }

      //draw quakes
      var q;
      for(var i = 0; i < self.quakes.length; i++)
      {
        q = self.quakes[i];
        if(
          self.t < q.t || //in the past
          (self.t-q.t)*quake_rate > 2 //far enough in future, can guarantee no longer on screen
        ) continue;

        dc.context.strokeStyle = "rgba(0,0,0,"+Math.pow(((i+1)/n_quakes),2)+")";
        dc.context.beginPath();
        //dc.context.arc(q.x,q.y,(self.t-q.t)*quake_rate*dc.width,0,2*Math.PI);
        dc.context.ellipse(q.x, q.y, (self.t-q.t)*quake_rate*dc.width, (self.t-q.t)*quake_rate*dc.height, 0, 0, 2 * Math.PI);
        dc.context.stroke();
      }
    }
  }

  var Quake = function(x,y,t)
  {
    var self = this;

    self.x = dc.width*x;
    self.y = dc.height*y;

    self.wx = x;
    self.wy = y;
    self.t = t;

    self.location_ts = [];
    for(var i = 0; i < n_locations; i++)
      self.location_ts[i] = 9999;
  }

  var Location = function(x,y)
  {
    var self = this;

    self.w = location_size*dc.width;
    self.h = location_size*dc.height;
    self.x = dc.width*x-self.w/2;
    self.y = dc.height*y-self.h/2;

    self.wx = x;
    self.wy = y;

    self.hover = function(evt)
    {
      highlit_loc = self;
    }
    self.unhover = function(evt)
    {
      if(highlit_loc == self) highlit_loc = undefined;
    }

    self.dragging = false;
    self.offX = 0;
    self.offY = 0;
    self.dragStart = function(evt)
    {
      self.offX = evt.doX-self.x;
      self.offY = evt.doY-self.y;
      self.drag(evt);
    }
    self.drag = function(evt)
    {
      self.deltaX = ((evt.doX-self.x)-self.offX);
      self.deltaY = ((evt.doY-self.y)-self.offY);
      self.x = self.x + self.deltaX;
      self.y = self.y + self.deltaY;
      self.offX = evt.doX - self.x;
      self.offY = evt.doY - self.y;
      self.wx = (self.x+self.w/2)/dc.width;
      self.wy = (self.y+self.h/2)/dc.height;
      highlit_loc = self;
      self.dragging = true;
      evt.hit_ui = true;
    }
    self.dragFinish = function()
    {
      self.dragging = false;
    }
  }

  var Scrubber = function(earth)
  {
    var self = this;
    self.w = dc.width;
    self.h = 20;
    self.x = 0;
    self.y = dc.height-self.h;

    self.earth = earth;

    //just to steal event from earth
    self.click = function(evt)
    {
      evt.hit_ui = true;
    }

    self.dragging = false;
    self.dragStart = function(evt)
    {
      evt.hit_ui = true;
      self.dragging = true;
      self.drag(evt);
    }
    self.drag = function(evt)
    {
      evt.hit_ui = true;
      if(!self.dragging) return;
      self.earth.t = Math.round((evt.doX/dc.width)*self.earth.recordable_t);
    }
    self.dragFinish = function(evt)
    {
      self.dragging = false;
    }

    self.drawBlip = function(t,alpha)
    {
      var x = Math.round((t/self.earth.recordable_t)*dc.width);
      dc.context.fillStyle = "rgba(255,0,0,"+alpha+")";
      dc.context.fillRect(x-1,self.y,2,self.h);
    }
    self.labelBlip = function(t)
    {
      var x = Math.round((t/self.earth.recordable_t)*dc.width);
      dc.context.fillText(Math.round(t),x,self.y-1);
    }
    self.draw = function()
    {
      //draw self
      dc.context.fillStyle = "#AAAAAA";
      dc.context.fillRect(self.x,self.y,self.w,self.h);
      var x = Math.round((self.earth.t/self.earth.recordable_t)*dc.width);
      dc.context.fillStyle = "#FFFFFF";
      dc.context.fillRect(x-2,self.y,4,self.h);

      //draw self t
      if(true)//self.dragging || self.earth.t == self.earth.recordable_t)
      {
        dc.context.fillStyle = "#000000";
        dc.context.font = "10px Helvetica";
        dc.context.textAlign = "right";
        dc.context.fillText(self.earth.t,x,self.y-1);
      }

      //draw ghost quake/loc blips
      var q;
      var l;
      q = self.earth.ghost_quake;
      for(var j = 0; j < self.earth.locations.length; j++)
      {
        self.drawBlip(q.location_ts[j],1);
        if(highlit_loc == self.earth.locations[j]) dc.context.fillStyle = "#000000"
        else                                       dc.context.fillStyle = "#FF0000"
        self.labelBlip(q.location_ts[j]);
      }

      //draw quake/loc blips
      var q;
      var l;
      for(var i = 0; i < self.earth.quakes.length; i++)
      {
        q = self.earth.quakes[i];
        for(var j = 0; j < self.earth.locations.length; j++)
        {
          if(q.location_ts[j] < self.earth.t)
            self.drawBlip(q.location_ts[j],Math.pow(((i+1)/n_quakes),2));
        }
      }

      //label most recent blips
      var q = self.earth.quakes[n_quakes-1];
      dc.context.fillStyle = "#000000";
      dc.context.font = "10px Helvetica";
      dc.context.textAlign = "right";

      var x = Math.round((q.t/self.earth.recordable_t)*dc.width);
      dc.context.fillText(q.t,x,self.y-1);

      for(var j = 0; j < self.earth.locations.length; j++)
      {
        if(q.location_ts[j] < self.earth.t)
          self.labelBlip(q.location_ts[j]);
      }

      //label highlit blips
      if(highlit_loc)
      {
        var highlit_loc_i = 0;
        for(var i = 0; i < self.earth.locations.length; i++)
          if(highlit_loc == self.earth.locations[i]) highlit_loc_i = i;

        var q;
        for(var i = 0; i < self.earth.quakes.length; i++)
        {
          q = self.earth.quakes[i];
          if(q.t < self.earth.t)
          {
            dc.context.font = "10px Helvetica";
            dc.context.textAlign = "right";

            var x = Math.round((q.t/self.earth.recordable_t)*dc.width);
            dc.context.fillStyle = "#000000";
            dc.context.fillText(q.t,x,self.y-1);

            if(q.location_ts[highlit_loc_i] < self.earth.t)
              self.labelBlip(q.location_ts[highlit_loc_i]);
          }
        }
      }

    }
  }

};

