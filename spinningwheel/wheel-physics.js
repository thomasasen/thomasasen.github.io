/* Casino Noir mechanical wheel simulation.
 * Physically motivated approximation: angular momentum, bearing friction,
 * velocity-dependent drag and dissipative elastic pointer contacts.
 * Crucially, no winner is selected or target angle calculated before motion.
 */
(function(root){
  'use strict';
  const mod=value=>((value%360)+360)%360;
  function sectorAt(angle,geometry){
    if(!geometry.length)return -1;
    const base=geometry[0].start;
    const offset=mod(-90-angle-base);
    let low=0,high=geometry.length-1;
    while(low<high){
      const mid=(low+high)>>1;
      if(offset<geometry[mid].end-base)high=mid;
      else low=mid+1;
    }
    // Zero-angle sectors are never selectable, including in proportional mode.
    if(geometry[low].size>0)return low;
    for(let i=0;i<geometry.length;i++)if(geometry[i].size>0)return i;
    return -1;
  }
  function create({angle=0,power=0,duration=6,coast=65,pointerIntensity=60,pointerSpring=65,geometry,random=Math.random}){
    if(!Array.isArray(geometry)||!geometry.length||!geometry.some(s=>s.size>0))
      throw Error('Keine sichtbaren Segmente vorhanden.');
    const pulse=Math.max(0,Math.min(1,power));
    const frictionScale=(6/Math.max(3,Math.min(30,duration)))*(1.1-.42*Math.max(0,Math.min(100,coast))/100);
    const initialSpeed=(420+900*pulse)*(.93+.14*random());
    const frictionVariance=.95+.1*random();
    const state={
      angle,velocity:initialSpeed,initialSpeed,elapsed:0,contacts:0,done:false,
      lastSector:sectorAt(angle,geometry),lastImpactSpeed:0,
      frictionScale:frictionScale*frictionVariance,
      pointerIntensity:Math.max(0,Math.min(100,pointerIntensity)),
      pointerSpring:Math.max(0,Math.min(100,pointerSpring)),
      geometry,limitSeconds:Math.max(12,Math.min(85,Math.max(3,duration)*2.5+6))
    };
    return state;
  }
  function advance(state,seconds,onContact){
    if(state.done)return state;
    const total=Math.max(0,Math.min(.1,seconds));
    let remaining=total;
    while(remaining>1e-8&&!state.done){
      const dt=Math.min(1/240,remaining);
      remaining-=dt;
      const speed=Math.abs(state.velocity);
      // Coulomb bearing resistance + linear viscous drag + quadratic wind drag.
      const loss=(39+speed*.075+speed*speed*.00023)*state.frictionScale*dt;
      const nextSpeed=Math.max(0,speed-loss);
      const nextVelocity=Math.sign(state.velocity)*nextSpeed;
      const nextAngle=state.angle+(state.velocity+nextVelocity)*.5*dt;
      const nextSector=sectorAt(nextAngle,state.geometry);
      if(nextSector>=0&&nextSector!==state.lastSector){
        state.contacts++;
        state.lastImpactSpeed=speed;
        // The contact removes rotational kinetic energy rather than merely
        // playing an unrelated sound. Slow contacts can reverse the wheel.
        const stiffness=.35+.65*state.pointerIntensity/100;
        if(speed<12+46*stiffness){
          state.velocity=-nextVelocity*(.12+.14*state.pointerSpring/100);
        }else{
          state.velocity=nextVelocity*(1-(.0025+.013/(1+speed/135))*stiffness);
        }
        if(typeof onContact==='function')onContact(speed,state.contacts);
      }else state.velocity=nextVelocity;
      state.angle=nextAngle;
      state.lastSector=nextSector;
      state.elapsed+=dt;
      if(Math.abs(state.velocity)<1.4||state.elapsed>=state.limitSeconds){
        state.velocity=0;
        state.done=true;
      }
    }
    return state;
  }
  function finish(state,maxSteps=30000){
    for(let i=0;i<maxSteps&&!state.done;i++)advance(state,1/120);
    if(!state.done)throw Error('Die physikalische Simulation konnte nicht konvergieren.');
    return state;
  }
  const api=Object.freeze({create,advance,finish,sectorAt});
  root.CasinoWheelPhysics=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
