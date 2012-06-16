// MooTools: the javascript framework.
// Load this file's selection again by visiting: http://mootools.net/more/f12d0039101d8e6fba6fbb21b7f9a5de 
// Or build this file again with packager using: packager build More/Element.Event.Pseudos More/Request.JSONP
/*
---
copyrights:
  - [MooTools](http://mootools.net)

licenses:
  - [MIT License](http://mootools.net/license.txt)
...
*/
MooTools.More={version:"1.4.0.1",build:"a4244edf2aa97ac8a196fc96082dd35af1abab87"};(function(){Events.Pseudos=function(h,e,f){var d="_monitorEvents:";var c=function(i){return{store:i.store?function(j,k){i.store(d+j,k);
}:function(j,k){(i._monitorEvents||(i._monitorEvents={}))[j]=k;},retrieve:i.retrieve?function(j,k){return i.retrieve(d+j,k);}:function(j,k){if(!i._monitorEvents){return k;
}return i._monitorEvents[j]||k;}};};var g=function(k){if(k.indexOf(":")==-1||!h){return null;}var j=Slick.parse(k).expressions[0][0],p=j.pseudos,i=p.length,o=[];
while(i--){var n=p[i].key,m=h[n];if(m!=null){o.push({event:j.tag,value:p[i].value,pseudo:n,original:k,listener:m});}}return o.length?o:null;};return{addEvent:function(m,p,j){var n=g(m);
if(!n){return e.call(this,m,p,j);}var k=c(this),r=k.retrieve(m,[]),i=n[0].event,l=Array.slice(arguments,2),o=p,q=this;n.each(function(s){var t=s.listener,u=o;
if(t==false){i+=":"+s.pseudo+"("+s.value+")";}else{o=function(){t.call(q,s,u,arguments,o);};}});r.include({type:i,event:p,monitor:o});k.store(m,r);if(m!=i){e.apply(this,[m,p].concat(l));
}return e.apply(this,[i,o].concat(l));},removeEvent:function(m,l){var k=g(m);if(!k){return f.call(this,m,l);}var n=c(this),j=n.retrieve(m);if(!j){return this;
}var i=Array.slice(arguments,2);f.apply(this,[m,l].concat(i));j.each(function(o,p){if(!l||o.event==l){f.apply(this,[o.type,o.monitor].concat(i));}delete j[p];
},this);n.store(m,j);return this;}};};var b={once:function(e,f,d,c){f.apply(this,d);this.removeEvent(e.event,c).removeEvent(e.original,f);},throttle:function(d,e,c){if(!e._throttled){e.apply(this,c);
e._throttled=setTimeout(function(){e._throttled=false;},d.value||250);}},pause:function(d,e,c){clearTimeout(e._pause);e._pause=e.delay(d.value||250,this,c);
}};Events.definePseudo=function(c,d){b[c]=d;return this;};Events.lookupPseudo=function(c){return b[c];};var a=Events.prototype;Events.implement(Events.Pseudos(b,a.addEvent,a.removeEvent));
["Request","Fx"].each(function(c){if(this[c]){this[c].implement(Events.prototype);}});})();(function(){var d={relay:false},c=["once","throttle","pause"],b=c.length;
while(b--){d[c[b]]=Events.lookupPseudo(c[b]);}DOMEvent.definePseudo=function(e,f){d[e]=f;return this;};var a=Element.prototype;[Element,Window,Document].invoke("implement",Events.Pseudos(d,a.addEvent,a.removeEvent));
})();Request.JSONP=new Class({Implements:[Chain,Events,Options],options:{onRequest:function(a){if(this.options.log&&window.console&&console.log){console.log("JSONP retrieving script with url:"+a);
}},onError:function(a){if(this.options.log&&window.console&&console.warn){console.warn("JSONP "+a+" will fail in Internet Explorer, which enforces a 2083 bytes length limit on URIs");
}},url:"",callbackKey:"callback",injectScript:document.head,data:"",link:"ignore",timeout:0,log:false},initialize:function(a){this.setOptions(a);},send:function(c){if(!Request.prototype.check.call(this,c)){return this;
}this.running=true;var d=typeOf(c);if(d=="string"||d=="element"){c={data:c};}c=Object.merge(this.options,c||{});var e=c.data;switch(typeOf(e)){case"element":e=document.id(e).toQueryString();
break;case"object":case"hash":e=Object.toQueryString(e);}var b=this.index=Request.JSONP.counter++;var f=c.url+(c.url.test("\\?")?"&":"?")+(c.callbackKey)+"=Request.JSONP.request_map.request_"+b+(e?"&"+e:"");
if(f.length>2083){this.fireEvent("error",f);}Request.JSONP.request_map["request_"+b]=function(){this.success(arguments,b);}.bind(this);var a=this.getScript(f).inject(c.injectScript);
this.fireEvent("request",[f,a]);if(c.timeout){this.timeout.delay(c.timeout,this);}return this;},getScript:function(a){if(!this.script){this.script=new Element("script",{type:"text/javascript",async:true,src:a});
}return this.script;},success:function(b,a){if(!this.running){return;}this.clear().fireEvent("complete",b).fireEvent("success",b).callChain();},cancel:function(){if(this.running){this.clear().fireEvent("cancel");
}return this;},isRunning:function(){return !!this.running;},clear:function(){this.running=false;if(this.script){this.script.destroy();this.script=null;
}return this;},timeout:function(){if(this.running){this.running=false;this.fireEvent("timeout",[this.script.get("src"),this.script]).fireEvent("failure").cancel();
}return this;}});Request.JSONP.counter=0;Request.JSONP.request_map={};