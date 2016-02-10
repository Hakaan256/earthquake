var GamePlayScene = function(game, stage)
{
  var self = this;
  var dc = stage.drawCanv;

  var location_size = 0.1;
  var quake_s_rate = 0.001;
  var quake_p_rate = 0.0005;
  var s_color = "#FF0000";
  var p_color = "#0000FF";
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
      l.shape = document.createElement('canvas');
      l.shape.width = 10;
      l.shape.height = 10;
      l.shape.context = l.shape.getContext('2d');
      l.shape.context.fillStyle = "#000000";
      if(i == 0) //square
      {
        l.shape.context.fillRect(0,0,l.shape.width,l.shape.height);
      }
      else if(i == 1) //circle
      {
        l.shape.context.beginPath();
        l.shape.context.arc(l.shape.width/2,l.shape.height/2,l.shape.width/2,0,2*Math.PI);
        l.shape.context.fill();
      }
      else if(i == 2) //triangle
      {
        l.shape.context.beginPath();
        l.shape.context.moveTo(0,l.shape.height);
        l.shape.context.lineTo(l.shape.width/2,0);
        l.shape.context.lineTo(l.shape.width,l.shape.height);
        l.shape.context.fill();
      }
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
    self.recordable_t = 1.5/quake_p_rate;

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
      self.ghost_quake.eval_loc_ts(self.locations);
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
      q.eval_loc_ts(self.locations);
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

    self.drawQuake = function(q)
    {
      dc.context.strokeStyle = s_color;
      dc.context.beginPath();
      dc.context.ellipse(q.x, q.y, (self.t-q.t)*quake_s_rate*dc.width, (self.t-q.t)*quake_s_rate*dc.height, 0, 0, 2 * Math.PI);
      dc.context.stroke();

      dc.context.strokeStyle = p_color;
      dc.context.beginPath();
      dc.context.ellipse(q.x, q.y, (self.t-q.t)*quake_p_rate*dc.width, (self.t-q.t)*quake_p_rate*dc.height, 0, 0, 2 * Math.PI);
      dc.context.stroke();
    }
    self.draw = function()
    {
      //draw distance viz
      var l;
      dc.context.strokeStyle = "rgba(0,0,0,0.1)";
      var mouse = { wx:self.hovering_wx, wy:self.hovering_wy, cx:self.hovering_wx*dc.width, cy:self.hovering_wy*dc.height };
      for(var i = 0; i < self.locations.length; i++)
      {
        l = self.locations[i];

        var x = l.wx-mouse.wx;
        var y = l.wy-mouse.wy;
        var d = Math.sqrt(x*x+y*y);

        dc.context.beginPath();
        //dc.context.ellipse(mouse.cx,mouse.cy,d*dc.width,d*dc.height,0,0,2*Math.PI); //circles around mouse
        //dc.context.ellipse((mouse.wx+x/2)*dc.width,(mouse.wy+y/2)*dc.height,d/2*dc.width,d/2*dc.height,0,0,2*Math.PI); //circles between mouse/location
        dc.context.ellipse(l.cx,l.cy,d*dc.width,d*dc.height,0,0,2*Math.PI); //circles around locs
        dc.context.moveTo(l.cx,l.cy); dc.context.lineTo(mouse.cx,mouse.cy); //line
        dc.context.stroke();

        //line annotations
        dc.context.fillStyle = "#000000";
        dc.context.font = "10px Helvetica";
        dc.context.textAlign = "right";
        dc.context.fillText("("+Math.round(d/quake_s_rate)+")",(mouse.wx+x/2)*dc.width,(mouse.wy+y/2)*dc.height);
      }

      //draw locations
      var l;
      dc.context.strokeStyle = "#000000";
      for(var i = 0; i < self.locations.length; i++)
      {
        l = self.locations[i];
        //dc.context.fillRect(l.x,l.y,l.w,l.h);
        dc.context.beginPath();
        dc.context.ellipse(l.cx,l.cy,location_size/2*dc.width,location_size/2*dc.height,0,0,2*Math.PI);
        dc.context.stroke();
        dc.context.drawImage(l.shape,l.cx-l.shape.width/2,l.cy-l.shape.height/2,l.shape.width,l.shape.height);
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
          (self.t-q.t)*quake_s_rate > 2 //far enough in future, can guarantee no longer on screen
        ) continue;

        dc.context.strokeStyle = "rgba(0,0,0,"+Math.pow(((i+1)/n_quakes),2)+")";
        self.drawQuake(q);
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

    self.location_s_ts = [];
    self.location_p_ts = [];
    for(var i = 0; i < n_locations; i++)
    {
      self.location_s_ts[i] = 9999;
      self.location_p_ts[i] = 9999;
    }

    self.eval_loc_ts = function(locations)
    {
      var l;
      for(var i = 0; i < locations.length; i++)
      {
        l = locations[i];
        var d = wdist(l,self);
        self.location_s_ts[i] = self.t+(d/quake_s_rate);
        self.location_p_ts[i] = self.t+(d/quake_p_rate);
      }
    }
  }

  var Location = function(x,y)
  {
    var self = this;

    self.wx = x;
    self.wy = y;

    self.cx = dc.width*self.wx;
    self.cy = dc.height*self.wy;

    self.w = location_size*dc.width;
    self.h = location_size*dc.height;
    self.x = self.cx-self.w/2;
    self.y = self.cy-self.h/2;

    self.shape; //sets externally

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
      self.cx = dc.width*self.wx;
      self.cy = dc.height*self.wy;
      highlit_loc = self;
      self.dragging = true;
      evt.hit_ui = true;
    }
    self.dragFinish = function()
    {
      self.dragging = false;
      for(var i = 0; i < n_quakes; i++)
        earth.quakes[i].eval_loc_ts(earth.locations);
      earth.ghost_quake.eval_loc_ts(earth.locations);
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

    self.drawBlip = function(t,solid)
    {
      var x = Math.round((t/self.earth.recordable_t)*dc.width);
      if(solid)
        dc.context.fillRect(x-1,self.y,2,self.h);
      else
      {
        dc.context.fillRect(x-2,self.y,4,self.h*0.2);
        dc.context.fillRect(x-2,self.y+self.h*0.8,4,self.h*0.2);
      }
    }
    self.labelBlip = function(t)
    {
      var x = Math.round((t/self.earth.recordable_t)*dc.width);
      dc.context.fillText(Math.round(t),x,self.y-1);
    }
    self.draw = function()
    {
      dc.context.font = "10px Helvetica";
      dc.context.textAlign = "right";

      var highlit_loc_i = -1;
      for(var i = 0; i < self.earth.locations.length; i++)
        if(highlit_loc == self.earth.locations[i]) highlit_loc_i = i;

      //draw self
      dc.context.fillStyle = "#AAAAAA";
      dc.context.fillRect(self.x,self.y,self.w,self.h);
      dc.context.fillStyle = "#FFFFFF";
      self.drawBlip(self.earth.t,1);
      dc.context.fillStyle = "#000000";
      self.labelBlip(self.earth.t,1);

      //draw ghost quake/loc blips
      var q;
      var l;
      q = self.earth.ghost_quake;
      for(var j = 0; j < self.earth.locations.length; j++)
      {
        if(j == highlit_loc_i)
        {
          dc.context.globalAlpha=1;
          dc.context.fillStyle = "#000000";
          self.labelBlip(q.location_s_ts[j]);
          self.labelBlip(q.location_p_ts[j]);
        }
        else
          dc.context.globalAlpha=0.2;
        dc.context.fillStyle = s_color; self.drawBlip(q.location_s_ts[j],0);
        dc.context.fillStyle = p_color; self.drawBlip(q.location_p_ts[j],0);
      }

      //draw quake/loc blips
      var q;
      var l;
      for(var i = 0; i < self.earth.quakes.length; i++)
      {
        q = self.earth.quakes[i];
        for(var j = 0; j < self.earth.locations.length; j++)
        {
          if(self.earth.t < q.location_s_ts[j]) continue;
          if(j == highlit_loc_i)
          {
            dc.context.globalAlpha=1;
            dc.context.fillStyle = "#000000";
            self.labelBlip(q.location_s_ts[j]);
            if(self.earth.t > q.location_p_ts[j]) self.labelBlip(q.location_p_ts[j]);
          }
          else
            dc.context.globalAlpha=0.2;
          dc.context.fillStyle = s_color; self.drawBlip(q.location_s_ts[j],1);
          if(self.earth.t > q.location_p_ts[j])
          {
            dc.context.fillStyle = p_color;
            self.drawBlip(q.location_p_ts[j],1);
          }
        }
      }
      dc.context.globalAlpha=1;
    }
  }

};

