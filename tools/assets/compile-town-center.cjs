'use strict';
// Deterministic data compilation; no network or imagery enters the game build.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),file=path.join(root,'assets/worlds/north-berwick/world.json');
const data=JSON.parse(fs.readFileSync(file,'utf8'));
const sites=JSON.parse(fs.readFileSync(path.join(root,'reference/north-berwick/town-center-sites.json'),'utf8'));
const p=data.projection,ids=new Set(sites.sites.map(s=>s.id));
// Clear old nearest-building guesses before assigning verified sites.
for(const b of data.buildings)if(ids.has(b.landmarkId)){delete b.landmarkId;b.style='residentialClapboard';}
const replaced=new Set(sites.sites.flatMap(s=>[s.buildingId,...s.replaceIds]));
data.buildings=data.buildings.filter(b=>!replaced.has(b.id));
data.landmarks=data.landmarks.filter(l=>!ids.has(l.id));
for(const s of sites.sites){
  const x=(s.lon-p.originLon)*p.metersPerDegLon,z=(p.originLat-s.lat)*p.metersPerDegLat,co=Math.cos(s.yaw),si=Math.sin(s.yaw);
  const ring=[[-1,-1],[1,-1],[1,1],[-1,1],[-1,-1]].map(([a,b])=>[x+co*a*s.w/2+si*b*s.d/2,z-si*a*s.w/2+co*b*s.d/2]);
  const frame={x,z,w:s.w,d:s.d,yaw:s.yaw,frontYaw:s.yaw,frontRoad:s.frontRoad};
  data.buildings.push({id:s.buildingId,heightM:s.h,heightSource:'Street-reference estimate; not surveyed',footprintAreaM2:s.w*s.d,centroid:[x,z],style:s.style,landmarkId:s.id,polygons:[[ring]],authoredFrame:frame});
  data.landmarks.push({id:s.id,name:s.name,address:s.address,category:s.style==='civic'?'civic':'retail',style:s.style,x,z,lat:s.lat,lon:s.lon,buildingId:s.buildingId,buildingDistanceM:0,detailRadiusM:260,priority:100,geocodeSource:s.evidence});
  const district=data.districts.find(d=>d.id===s.id);if(district){district.x=x;district.z=z;}
}
data.townCenterRevision=sites.revision;
fs.writeFileSync(file,JSON.stringify(data)+'\n');
console.log(`Compiled ${sites.sites.length} street-reference sites; source roads unchanged.`);
