import * as THREE from 'three';
// Player-exclusive geometry and materials; traffic has its own independent factory.
const cube=new THREE.BoxGeometry(1,1,1);
function shell(material,sections){
 const points=[],indices=[];
 for(const [z,w,roof,bottom,belt,top] of sections)points.push(-w*.9,bottom,z,w*.9,bottom,z,w,belt,z,roof,top,z,-roof,top,z,-w,belt,z);
 for(let r=0;r<sections.length-1;r++)for(let i=0;i<6;i++){const a=r*6+i,b=r*6+(i+1)%6,c=b+6,d=a+6;indices.push(a,b,c,a,c,d);}
 for(let i=1;i<5;i++){indices.push(0,i+1,i);const a=(sections.length-1)*6;indices.push(a,a+i,a+i+1);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geometry.setIndex(indices);geometry.computeVertexNormals();return new THREE.Mesh(geometry,material);
}
export function createHeroCar(glowTexture){
 const root=new THREE.Group(),body=new THREE.Group(),headlightHinges=[];root.add(body);
 const paint=new THREE.MeshStandardMaterial({color:0xf1f0e7,metalness:.12,roughness:.44,flatShading:true});
 const trim=new THREE.MeshStandardMaterial({color:0x15171b,roughness:.78});
 const rubber=new THREE.MeshStandardMaterial({color:0x080a0c,roughness:.95});
 const glass=new THREE.MeshStandardMaterial({color:0x23333d,metalness:.35,roughness:.24,flatShading:true});
 const alloy=new THREE.MeshStandardMaterial({color:0xb4b8ba,metalness:.7,roughness:.35});
 const tail=new THREE.MeshBasicMaterial({color:0xff2318}),edge=new THREE.MeshBasicMaterial({color:0xfff2d9});
 const amber=new THREE.MeshBasicMaterial({color:0xe88b26}),reverse=new THREE.MeshBasicMaterial({color:0xb7b9aa});
 const box=(m,x,y,z,w,h,d)=>{const o=new THREE.Mesh(cube,m);o.position.set(x,y,z);o.scale.set(w,h,d);body.add(o);return o;};
 const panel=(m,sections,x=0)=>{const o=shell(m,sections);o.position.x=x;body.add(o);return o;};
 // Compact three-door body: straight belt line, flat bonnet and sloping hatch.
 panel(trim,[[-1.65,.71,.71,.23,.39,.46],[-1.15,.77,.75,.22,.43,.49],[1.14,.77,.75,.22,.43,.49],[1.64,.72,.72,.25,.43,.49]]);
 // Continuous bonnet closes the former retracting-headlight wells.
 const hoodY=z=>.59+(z+1.61)*(.08/.93);
 panel(paint,[[-1.61,.71,.67,.43,.56,.59],[-.68,.76,.7,.44,.64,.67],[.96,.76,.7,.44,.64,.67],[1.59,.72,.68,.44,.61,.64]]);

 panel(glass,[[-.63,.627,.575,.663,.684,.699],[-.18,.617,.522,.677,.784,1.026],[.47,.617,.522,.677,.795,1.046],[1.34,.617,.585,.663,.69,.715]]);
 panel(paint,[[-.21,.55,.53,1.026,1.043,1.062],[.49,.55,.53,1.046,1.063,1.082]]);
 // A/C pillars, single long door and rear quarter glass on each side.
 for(const side of [-1,1]){
  panel(paint,[[-.69,.024,.024,.64,.67,.69],[-.19,.024,.024,.99,1.025,1.055]],side*.565);
  panel(paint,[[.45,.038,.032,1.015,1.045,1.07],[1.41,.046,.039,.64,.68,.715]],side*.576);
  box(trim,side*.625,.67,.32,.03,.03,1.93);
  box(trim,side*.537,1.045,.13,.026,.025,.67);
  box(trim,side*.624,.851,.36,.026,.35,.046);
  box(trim,side*.755,.459,0,.023,.044,2.65);
  box(trim,side*.75,.57,.29,.026,.038,.16);
  box(trim,side*.761,.548,.48,.014,.17,.015);
  box(trim,side*.8,.715,-.49,.13,.05,.045);
  box(trim,side*.864,.75,-.49,.15,.105,.16);
  // Permanently raised assembly. The fitted skirt meets the bonnet exactly;
  // hidden housing geometry is clipped at that seam to avoid intersections.
  const hinge=new THREE.Group();hinge.position.set(side*.47,hoodY(-1.09),-1.09);body.add(hinge);
  const part=(m,x,y,z,w,h,d)=>{const mesh=box(m,x,y,z,w,h,d);body.remove(mesh);hinge.add(mesh);return mesh;};
  const c=Math.cos(HEADLIGHT_OPEN_ANGLE),sn=Math.sin(HEADLIGHT_OPEN_ANGLE);
  const profile=[[0,-.35],[-.135,-.255],[-.025,-.015],[0,-.015]].map(([y,z])=>[hinge.position.y+y*c-z*sn,-1.09+y*sn+z*c]);
  const clipped=[];
  for(let j=0;j<profile.length;j++){
   const a=profile[j],b=profile[(j+1)%profile.length],da=a[0]-hoodY(a[1]),db=b[0]-hoodY(b[1]);
   if(da>=0)clipped.push(a);
   if((da>=0)!==(db>=0)){const t=da/(da-db);clipped.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}
  }
  const prism=(outline,material)=>{
   const positions=[],indices=[],n=outline.length;
   for(const x of [-.19,.19])for(const [y,z] of outline)positions.push(side*.47+x,y,z);
   for(let j=1;j<n-1;j++)indices.push(0,j,j+1,n,n+j+1,n+j);
   for(let j=0;j<n;j++){const k=(j+1)%n;indices.push(j,k+n,k,j,j+n,k+n);}
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
   const mesh=new THREE.Mesh(geometry,material);body.add(mesh);return mesh;
  };
  const housing=prism(clipped,trim);
  // Return the housing to assembly-local coordinates so it follows the lamps.
  housing.geometry.translate(-hinge.position.x,-hinge.position.y,-hinge.position.z);housing.geometry.rotateX(-HEADLIGHT_OPEN_ANGLE);body.remove(housing);hinge.add(housing);
  const lower=profile[1],seam=clipped[2];
  prism([lower,[hoodY(lower[1]),lower[1]],seam],paint);
  part(paint,0,.009,-.1825,.4,.018,.355);
  const lamp=part(edge,0,-.064,-.319,.3,.117,.018);lamp.rotation.x=-HEADLIGHT_OPEN_ANGLE;
  hinge.userData.lamp=lamp;hinge.rotation.x=HEADLIGHT_OPEN_ANGLE;headlightHinges.push(hinge);
  box(amber,side*.59,.382,-1.712,.22,.065,.022);
  box(trim,side*.5,.562,1.627,.57,.19,.045);
  box(tail,side*.49,.574,1.654,.32,.106,.023);
  box(amber,side*.698,.574,1.654,.085,.106,.023);
  box(reverse,side*.277,.574,1.654,.073,.106,.023);
  box(trim,side*.49,.57,1.67,.52,.012,.009);
  for(const z of [-1.04,1.01]){
   const tire=new THREE.Mesh(new THREE.CylinderGeometry(.285,.285,.17,20),rubber);tire.rotation.z=Math.PI/2;tire.position.set(side*.77,.285,z);body.add(tire);
   const rim=new THREE.Mesh(new THREE.CylinderGeometry(.184,.184,.024,16),trim);rim.rotation.z=Math.PI/2;rim.position.set(side*.865,.285,z);body.add(rim);
   const ring=new THREE.Mesh(new THREE.TorusGeometry(.178,.017,4,20),alloy);ring.rotation.y=Math.PI/2;ring.position.set(side*.883,.285,z);body.add(ring);
   for(let n=0;n<8;n++){const a=n*Math.PI/4;const spoke=box(alloy,side*.887,.285+Math.cos(a)*.093,z+Math.sin(a)*.093,.016,.14,.026);spoke.rotation.x=a;}
   box(alloy,side*.893,.285,z,.024,.067,.067);
   const arch=new THREE.Mesh(new THREE.TorusGeometry(.313,.026,4,16,Math.PI),paint);arch.rotation.y=Math.PI/2;arch.position.set(side*.776,.285,z);body.add(arch);
  }
 }
 box(trim,0,.375,-1.645,1.46,.18,.12);box(trim,0,.374,1.625,1.46,.17,.13);
 box(trim,0,.521,-1.632,.46,.061,.025);box(alloy,0,.522,-1.649,.11,.025,.012);
 box(trim,0,.266,-1.55,1.37,.06,.16);
 box(trim,0,.544,1.638,.37,.17,.025);box(reverse,0,.543,1.657,.26,.082,.01);
 const hatch=box(paint,0,.696,1.408,1.28,.046,.21);hatch.rotation.x=.36;
 const wiper=box(trim,.12,.894,.913,.024,.016,.42);wiper.rotation.x=.38;wiper.rotation.y=-.25;
 const exhaust=new THREE.Mesh(new THREE.CylinderGeometry(.065,.065,.23,12),alloy);exhaust.rotation.x=Math.PI/2;exhaust.position.set(-.51,.235,1.6);body.add(exhaust);
 const outlet=new THREE.Mesh(new THREE.CircleGeometry(.049,12),trim);outlet.position.set(-.51,.235,1.718);body.add(outlet);
 const under=new THREE.Mesh(new THREE.PlaneGeometry(3.8,5.2),new THREE.MeshBasicMaterial({color:0x43ffef,map:glowTexture,transparent:true,opacity:.2,depthWrite:false}));under.rotation.x=-Math.PI/2;under.position.y=.04;root.add(under);
 root.userData={body,glow:under,tail,edge,signals:[],headlightHinges,tailColor:0xff2318,headlightColor:0xfff2d9,exhaustAnchors:[[-.51,.235,1.72]],trailAnchors:[[-.49,.574,1.67],[.49,.574,1.67]]};return root;
}

// Fixed raised angle; lamps counter-rotate locally to face straight ahead.
export const HEADLIGHT_OPEN_ANGLE=.62;
