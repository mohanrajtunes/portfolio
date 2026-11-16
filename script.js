(function(){
var d=document,root=d.documentElement;root.classList.add('js');
var $=function(s){return d.querySelector(s)},$$=function(s){return [].slice.call(d.querySelectorAll(s))};
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
var fine=matchMedia('(pointer:fine)').matches;

/* ---------- blue ripple texture ---------- */
var canvas=$('#bg'),lensEl=$('#lens'),gl=null;
var mouse={x:innerWidth*.6,y:innerHeight*.5},lens={x:mouse.x,y:mouse.y,r:0,tr:0};
try{gl=canvas.getContext('webgl',{antialias:false,alpha:false})}catch(e){}
if(gl){try{
  var vs='attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  var fs=[
  'precision highp float;',
  'uniform vec2 R;uniform float T,S,DPR,STIR,SW;uniform vec2 M;uniform float LR;uniform sampler2D IMG;uniform vec2 IS;',
  'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
  'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}',
  'float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n(p);p=p*2.03+1.7;a*=.5;}return v;}',
  'vec3 img(vec2 s){',
  ' float ra=R.x/R.y,ia=IS.x/IS.y; vec2 c=s;',
  ' if(ra>ia){c.y=(s.y-.5)*ia/ra+.5;}else{c.x=(s.x-.5)*ra/ia+.5;}',
  ' c=(c-.5)/1.12+.5;',
  ' c.y+=.035-S*.012; c.y=clamp(c.y,.01,.99);',
  ' vec2 q=c*3.;',
  ' float tt=T*.11+S*.35;',
  ' vec2 d=vec2(fbm(q+vec2(tt,0.)),fbm(q+vec2(5.2,1.3)-vec2(0.,tt*.9)))-.5;',
  ' vec2 d2=vec2(fbm(q*1.7+d*3.+tt*.6),fbm(q*1.7-d*3.+9.1-tt*.5))-.5;',
  ' c+=d*(.07+STIR*.06)+d2*(.035+STIR*.04);',
  ' vec3 col=texture2D(IMG,c).rgb;',
  ' float g=pow(fbm(c*9.+T*.15),3.);',
  ' col+=vec3(.3,.55,1.)*g*.55;',
  ' return col;}',
  'void main(){',
  ' vec2 s=gl_FragCoord.xy/R; s.y=1.-s.y;',
  ' vec2 uv=gl_FragCoord.xy/R.y; vec2 m=M/R.y; float lr=LR/R.y;',
  ' float dl=length(uv-m); float ins=lr>0.?smoothstep(lr,lr-.003,dl):0.;',
  ' vec2 ms=vec2(M.x/R.x,1.-M.y/R.y);',
  ' vec2 a=vec2(R.x/R.y,1.); vec2 dv=(s-ms)*a; float k=exp(-dot(dv,dv)/.03);',
  ' float ang=k*SW; vec2 sz=ms+mat2(cos(ang),-sin(ang),sin(ang),cos(ang))*((s-ms)*a)/a;',
  ' sz+=normalize(dv+1e-4)/a*k*SW*.02;',
  ' vec3 col=img(sz);',
  ' col*=1.+.18*k*min(abs(SW),1.);',
  ' vec2 v=gl_FragCoord.xy/R-.5; col*=1.-.35*dot(v,v);',
  ' col+=(h(gl_FragCoord.xy+fract(T*7.)*31.)-.5)*.03;',
  ' gl_FragColor=vec4(col,1.);}'
  ].join('\n');
  function sh(t,s){var o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw gl.getShaderInfoLog(o);return o}
  var pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,vs));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(pr);gl.useProgram(pr);
  var b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  var al=gl.getAttribLocation(pr,'a');gl.enableVertexAttribArray(al);gl.vertexAttribPointer(al,2,gl.FLOAT,false,0,0);
  var U={};['R','T','S','DPR','M','LR','IMG','IS','STIR','SW'].forEach(function(k){U[k]=gl.getUniformLocation(pr,k)});
  var tex=gl.createTexture(),ready=false,isz=[2400,1600];
  gl.bindTexture(gl.TEXTURE_2D,tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([4,10,31,255]));
  var im=new Image();im.onload=function(){gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,im);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    isz=[im.naturalWidth,im.naturalHeight];ready=true;canvas.style.background='#040A1F'};
  im.src='liquid.jpg';
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  var dpr=1,W=0,H=0;
  function size(){dpr=Math.min(devicePixelRatio||1,innerWidth<700?1.5:1.75);var w=Math.round(innerWidth*dpr),h=Math.round(innerHeight*dpr);if(w!==W||h!==H){W=w;H=h;canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h)}}
  size();addEventListener('resize',size);
  var sc=0,t0=performance.now(),stir=0,sw=0,lastS=scrollY,lastM={x:mouse.x,y:mouse.y};
  function frame(now){
    var t=(now-t0)/1000,target=scrollY/innerHeight;
    sc+=(target-sc)*(reduce?1:.06);
    var ds=Math.abs(scrollY-lastS);lastS=scrollY;stir+=(Math.min(ds/60,1.5)-stir)*.06;
    var mv=Math.hypot(mouse.x-lastM.x,mouse.y-lastM.y);lastM.x=mouse.x;lastM.y=mouse.y;sw+=(Math.min(mv/18,2.4)-sw)*.07;
    lens.x+=(mouse.x-lens.x)*.16;lens.y+=(mouse.y-lens.y)*.16;lens.r+=(lens.tr-lens.r)*.14;
    gl.uniform2f(U.R,W,H);gl.uniform1i(U.IMG,0);gl.uniform2f(U.IS,isz[0],isz[1]);gl.uniform1f(U.T,reduce?4:t);gl.uniform1f(U.S,sc);gl.uniform1f(U.DPR,dpr);
    gl.uniform2f(U.M,lens.x*dpr,(innerHeight-lens.y)*dpr);gl.uniform1f(U.LR,0.);gl.uniform1f(U.STIR,stir);gl.uniform1f(U.SW,0.);
    gl.drawArrays(gl.TRIANGLES,0,3);
    if(!reduce)requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  if(reduce)addEventListener('scroll',function(){requestAnimationFrame(frame)},{passive:true});
}catch(e){console.warn('texture off',e);gl=null}}

/* ---------- glass card light follows pointer ---------- */
$$('.card-g').forEach(function(c){c.addEventListener('pointermove',function(e){var r=c.getBoundingClientRect();c.style.setProperty('--x',(e.clientX-r.left)+'px');c.style.setProperty('--y',(e.clientY-r.top)+'px')})});

/* ---------- nav ---------- */
var nav=$('#nav'),burger=$('#burger');
function setMenu(o){nav.classList.toggle('open',o);burger.setAttribute('aria-expanded',o);burger.setAttribute('aria-label',o?'Close menu':'Open menu')}
burger.addEventListener('click',function(){setMenu(!nav.classList.contains('open'))});
$$('#links a').forEach(function(a){a.addEventListener('click',function(){setMenu(false)})});
d.addEventListener('keydown',function(e){if(e.key==='Escape')setMenu(false)});

/* ---------- split headings into words ---------- */
$$('[data-split]').forEach(function(el){var words=el.textContent.trim().split(/\s+/);el.setAttribute('aria-label',el.textContent.trim());
  el.innerHTML=words.map(function(w,i){return '<span class="w" aria-hidden="true"><span style="--i:'+i+'">'+w.replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</span></span>'}).join(' ')});

/* ---------- stagger index for stack pills ---------- */
$$('.stack,.pills').forEach(function(u){[].forEach.call(u.children,function(li,i){li.style.setProperty('--j',i)})});

/* ---------- reveals ---------- */
var groups=new Map();
$$('[data-in]').forEach(function(el){var p=el.parentNode,k=groups.get(p)||0;el.style.setProperty('--d',(k*110)+'ms');groups.set(p,k+1)});
var all=$$('[data-in],[data-split]');
if('IntersectionObserver' in window){
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add(e.target.hasAttribute('data-split')?'split-in':'in');io.unobserve(e.target)}})},{threshold:.15});
  all.forEach(function(el){io.observe(el)});
}else all.forEach(function(el){el.classList.add('in','split-in')});

/* ---------- nav backdrop ---------- */
addEventListener('scroll',function(){nav.classList.toggle('solid',scrollY>40)},{passive:true});

/* ---------- active nav link ---------- */
var secs=['about','work','skills'].map(function(id){return d.getElementById(id)}),la=$$('#links a');
addEventListener('scroll',function(){var mid=innerHeight*.4,cur=-1;secs.forEach(function(s,i){var r=s.getBoundingClientRect();if(r.top<mid&&r.bottom>mid)cur=i});la.forEach(function(a,i){a.classList.toggle('cur',i===cur)})},{passive:true});

/* ---------- tech stack: scroll-driven constellation ---------- */
(function(){
  var sec=$('#skills'),field=$('#field'),cv=$('#stars'),ctx=cv.getContext('2d'),stars=$$('.star'),labels=$$('.glabel'),used=$('#used'),cap=$('#cap'),capT=$('#cap-t'),capS=$('#cap-s'),pjs=$$('.pj');
  var G=['ai','be','fe','sh'],PRJ=['Sift','HireLens','PingBoard','ShopFlow'];
  var LINE={Sift:'Search, an AI agent and a live UI',HireLens:'An LLM app with checked answers',PingBoard:'Monitoring that runs on a schedule',ShopFlow:'A store where stock stays correct'};
  function rnd(i){var x=Math.sin(i*99.13+7.7)*43758.5453;return x-Math.floor(x)}
  var N=stars.map(function(el,i){return {el:el,g:el.dataset.g,u:el.dataset.u.split(', '),i:i,sx:rnd(i),sy:rnd(i+50),x:0,y:0,tx:0,ty:0}});
  var W=0,H=0,dpr=1,sel=null,pick=null;
  function layout(){
    var r=field.getBoundingClientRect();W=r.width;H=r.height;dpr=Math.min(devicePixelRatio||1,2);cv.width=W*dpr;cv.height=H*dpr;
    var port=W<700,cells=port?G.map(function(g,k){return {x:.5,y:(k+.5)/4,w:.92,h:.22}}):[{x:.27,y:.3,w:.4,h:.42},{x:.73,y:.3,w:.4,h:.42},{x:.27,y:.76,w:.4,h:.38},{x:.73,y:.76,w:.4,h:.38}];
    G.forEach(function(g,k){var c=cells[k],L=N.filter(function(n){return n.g===g}),cols=port?3:(L.length>6?3:2),rows=Math.ceil(L.length/cols);
      L.forEach(function(n,j){var cx=j%cols,ry=Math.floor(j/cols),jx=(rnd(n.i+9)-.5)*.5,jy=(rnd(n.i+19)-.5)*.5;
        n.tx=(c.x-c.w/2+(cx+.5+jx*.6)*c.w/cols-(port?.06:.04))*W;n.ty=(c.y-c.h/2+(ry+.5+jy*.5)*c.h/rows)*H});
      var lab=labels[k];lab.style.left=(c.x*W)+'px';lab.style.top=(c.y*H)+'px';n=null});
  }
  layout();addEventListener('resize',layout);
  function prog(){var r=sec.getBoundingClientRect(),span=r.height-innerHeight;return span>0?Math.min(1,Math.max(0,-r.top/span)):1}
  function ease(t){t=Math.min(1,Math.max(0,t));return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2}
  function edges(){var E=[];G.forEach(function(g){var L=N.filter(function(n){return n.g===g});for(var j=1;j<L.length;j++){E.push([L[j-1],L[j]]);if(j>1&&j%2===0)E.push([L[0],L[j]])}});return E}
  var EG=edges();
  function seg(a,b,t,alpha,wid,glow){if(t<=0)return;var x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;ctx.strokeStyle='rgba(170,205,255,'+alpha+')';ctx.lineWidth=wid;ctx.shadowBlur=glow;ctx.shadowColor='rgba(120,180,255,.9)';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(x,y);ctx.stroke()}
  var lastPrj=-2,lastCap='';
  function setCap(t,s){var k=t+s;if(k===lastCap)return;lastCap=k;capT.textContent=t;capS.textContent=s;cap.classList.remove('swap');void cap.offsetWidth;cap.classList.add('swap')}
  function show(n){sel=n;stars.forEach(function(el){el.classList.toggle('sel',!!n&&el===n.el)});used.classList.toggle('on',!!n);
    if(n)used.innerHTML='<span>'+n.el.textContent.trim()+' is in</span>'+n.u.map(function(p){return '<i>'+p+'</i>'}).join('')}
  stars.forEach(function(el,i){el.addEventListener('click',function(){show(sel===N[i]?null:N[i])})});
  pjs.forEach(function(b,k){b.addEventListener('click',function(){var r=sec.getBoundingClientRect(),span=sec.offsetHeight-innerHeight,target=.5+(k+.5)*.125;
    scrollTo({top:scrollY+r.top+span*target,behavior:reduce?'auto':'smooth'})})});
  function frame(now){
    var t=now/1000,p=reduce?.5:prog();
    var form=ease(p/.22),link=Math.min(1,Math.max(0,(p-.22)/.24)),pi=p>=.5?Math.min(3,Math.floor((p-.5)/.125)):-1,pt=p>=.5?((p-.5)/.125)-pi:0;
    if(pick!==null)pi=pick;
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);
    N.forEach(function(n,i){var dx=Math.sin(t*.5+i)*3,dy=Math.cos(t*.4+i*1.3)*3;n.x=n.sx*W+(n.tx-n.sx*W)*form+dx;n.y=n.sy*H+(n.ty-n.sy*H)*form+dy;
      n.el.style.transform='translate('+(n.x-11)+'px,'+(n.y)+'px) translateY(-50%)';n.el.style.opacity=pi<0?String(.25+.75*Math.min(1,p/.08)):''});
    labels.forEach(function(l){l.style.opacity=String(form);l.classList.toggle('on',link>.9&&pi<0)});
    var prj=pi>=0?PRJ[pi]:null;
    EG.forEach(function(e,k){var lt=Math.min(1,Math.max(0,link*EG.length/6-k/6*.9));seg(e[0],e[1],lt,prj?.08:.32,1,0)});
    if(prj){var L=N.filter(function(n){return n.u.indexOf(prj)>-1}),cx=0,cy=0;L.forEach(function(n){cx+=n.x;cy+=n.y});cx/=L.length;cy/=L.length;
      L.sort(function(a,b){return Math.atan2(a.y-cy,a.x-cx)-Math.atan2(b.y-cy,b.x-cx)});
      var drawn=pick!==null?1:Math.min(1,pt*2.2);
      for(var j=0;j<L.length;j++){var a=L[j],b=L[(j+1)%L.length],f=Math.min(1,Math.max(0,drawn*L.length-j));seg(a,b,f,.85,1.6,12)}
      ctx.shadowBlur=0;
      N.forEach(function(n){var on=n.u.indexOf(prj)>-1;n.el.classList.toggle('lit',on);n.el.classList.toggle('dim',!on)});
      setCap(prj+' uses '+L.length+' of these',LINE[prj]);
    }else{N.forEach(function(n){n.el.classList.remove('lit','dim')});ctx.shadowBlur=0;
      setCap(link>.95?'All connected':'Every skill I use',link>.95?'Keep scrolling to see each project':'Scroll to connect them');}
    pjs.forEach(function(b,k){b.classList.toggle('on',k===pi)});
    /* twinkle dots on canvas */
    N.forEach(function(n,i){var tw=.5+.5*Math.sin(t*2+i*1.7);ctx.fillStyle='rgba(180,215,255,'+(.15+.25*tw)*form+')';ctx.beginPath();ctx.arc(n.x,n.y,10+4*tw,0,6.283);ctx.fill()});
    if(!reduce)requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  if(reduce)addEventListener('resize',function(){requestAnimationFrame(frame)});
  pjs.forEach(function(b,k){b.addEventListener('mouseenter',function(){if(fine)pick=k});b.addEventListener('mouseleave',function(){pick=null})});
})();

/* ---------- live previews: load iframes when near ---------- */
if('IntersectionObserver' in window){
  var pio=new IntersectionObserver(function(es){es.forEach(function(e){if(!e.isIntersecting)return;var f=e.target;f.addEventListener('load',function(){f.classList.add('ok')});f.src=f.dataset.src;pio.unobserve(f)})},{rootMargin:'300px'});
  $$('.prev iframe').forEach(function(f){pio.observe(f)});
}

/* ---------- copy email ---------- */
var toast=$('#toast'),tt;
function say(t){toast.textContent=t;toast.classList.add('on');clearTimeout(tt);tt=setTimeout(function(){toast.classList.remove('on')},1800)}
$('#copy').addEventListener('click',function(){var m='mohanrajtunes@gmail.com';(navigator.clipboard?navigator.clipboard.writeText(m):Promise.reject()).then(function(){say('Email copied')}).catch(function(){say(m)})});
})();
