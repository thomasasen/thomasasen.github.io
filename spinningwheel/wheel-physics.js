/* Casino Noir mechanical wheel simulation.
 * Physically motivated approximation: angular momentum, bearing friction,
 * velocity-dependent drag and dissipative elastic pointer contacts.
 * Crucially, no winner is selected or target angle calculated before motion.
 */
(function(root){
  'use strict';
  const mod=value=>((value%360)+360)%360;
  // Motion is effectively unobservable below this velocity. The wheel must
  // remain below it for a continuous interval before a result may be declared.
  const REST_SPEED=0.05; // degrees/second: <0.0003 degrees per 240 Hz step
  const REST_HOLD_SECONDS=0.4;
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

  // Distribute mechanical ratchet teeth within each visible winning sector.
  // Eight sectors x seven teeth gives the traditional 56 outer studs.
  // Bound rendering and simulation costs for very densely segmented wheels.
  const MAX_PEGS=336;
  function buildPegAngles(geometry,subdivisions=7){
    const visible=geometry.filter(sector=>sector.size>1e-8);
    if(!visible.length)return [];
    const desired=Number.isFinite(Number(subdivisions))?Math.round(Number(subdivisions)):7;
    const perSector=Math.max(1,Math.min(12,desired,Math.floor(MAX_PEGS/visible.length)||1));
    const stride=Math.max(1,Math.ceil(visible.length*perSector/MAX_PEGS));
    const pegs=[];
    for(let i=0;i<visible.length;i+=stride){
      const sector=visible[i];
      for(let j=0;j<perSector;j++)pegs.push(mod(sector.start+sector.size*j/perSector));
    }
    return pegs.sort((a,b)=>a-b);
  }
  function firstAbove(values,value){
    let low=0,high=values.length;
    while(low<high){
      const mid=(low+high)>>1;
      if(values[mid]<=value)low=mid+1;
      else high=mid;
    }
    return low;
  }
  // Crossings are detected at the actual outer studs, not only when the
  // highlighted winning sector changes. Binary search keeps this efficient.
  function crossedPegs(from,to,pegs){
    if(!pegs.length||to===from)return [];
    const direction=Math.sign(to-from),phase=mod(from);
    let base=Math.floor(from/360)*360;
    let index=direction>0?firstAbove(pegs,phase+1e-8):firstAbove(pegs,phase-1e-8)-1;
    if(index===pegs.length){index=0;base+=360;}
    if(index<0){index=pegs.length-1;base-=360;}
    const hits=[];
    while(hits.length<=pegs.length){
      const hitAngle=base+pegs[index];
      if(direction>0?hitAngle>to+1e-8:hitAngle<to-1e-8)break;
      hits.push(index);
      index+=direction;
      if(index>=pegs.length){index=0;base+=360;}
      if(index<0){index=pegs.length-1;base-=360;}
    }
    return hits;
  }
  function create({angle=0,power=0,duration=6,coast=65,pointerIntensity=60,pointerSpring=65,subdivisions=7,geometry,random=Math.random}){
    if(!Array.isArray(geometry)||!geometry.length||!geometry.some(s=>s.size>0))
      throw Error('Keine sichtbaren Segmente vorhanden.');
    const pulse=Math.max(0,Math.min(1,power));
    const frictionScale=(6/Math.max(3,Math.min(30,duration)))*(1.1-.42*Math.max(0,Math.min(100,coast))/100);
    const initialSpeed=(420+900*pulse)*(.93+.14*random());
    const frictionVariance=.95+.1*random();
    const pegAngles=buildPegAngles(geometry,subdivisions);
    // Angular positions at which a rotating tooth reaches the fixed pointer.
    const contactAngles=pegAngles.map(angle=>mod(-90-angle)).sort((a,b)=>a-b);
    const state={
      angle,velocity:initialSpeed,initialSpeed,elapsed:0,contacts:0,done:false,restSeconds:0,
      lastSector:sectorAt(angle,geometry),lastImpactSpeed:0,lastContactIndex:null,
      pegAngles,contactAngles,
      frictionScale:frictionScale*frictionVariance,
      pointerIntensity:Math.max(0,Math.min(100,pointerIntensity)),
      pointerSpring:Math.max(0,Math.min(100,pointerSpring)),
      geometry,
      // Soft failsafe only. Never force-stop a moving wheel at a timer limit.
      safetyStartSeconds:Math.max(12,Math.min(85,Math.max(3,duration)*2.5+6))
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
      const bearing=39*speed/(speed+14);
      const viscous=speed*.075;
      const wind=speed*speed*.00023;
      const overrun=Math.max(0,(state.elapsed/state.safetyStartSeconds)-.78);
      const safetyDrag=1+8*overrun*overrun;
      // A one-way pawl rapidly dissipates the small reverse swing after
      // the final impact. Continuous drag avoids a visibly forced stop.
      const reverseDrag=state.velocity<0?3.8:1;
      const loss=(bearing+viscous+wind)*state.frictionScale*safetyDrag*reverseDrag*dt;
      const nextSpeed=Math.max(0,speed-loss);
      const nextVelocity=Math.sign(state.velocity)*nextSpeed;
      const nextAngle=state.angle+(state.velocity+nextVelocity)*.5*dt;
      const hits=crossedPegs(state.angle,nextAngle,state.contactAngles);
      let velocity=nextVelocity;
      for(const index of hits){
        // A tiny reverse crossing of the same tooth is not a new strike.
        if(index===state.lastContactIndex)continue;
        state.lastContactIndex=index;
        state.contacts++;
        state.lastImpactSpeed=speed;
        const stiffness=.35+.65*state.pointerIntensity/100;
        if(speed<9+9*stiffness){
          velocity=-Math.sign(state.velocity)*Math.abs(velocity)*(.08+.10*state.pointerSpring/100);
          if(typeof onContact==='function')onContact(speed,state.contacts);
          break;
        }
        velocity*=1-(.0025+.013/(1+speed/135))*stiffness;
        if(typeof onContact==='function')onContact(speed,state.contacts);
      }
      state.velocity=velocity;
      state.angle=nextAngle;
      state.lastSector=sectorAt(nextAngle,state.geometry);
      state.elapsed+=dt;
      // A winner is selected only after a sustained low-speed rest period.
      if(Math.abs(state.velocity)<=REST_SPEED){
        state.restSeconds+=dt;
        if(state.restSeconds>=REST_HOLD_SECONDS){
          state.velocity=0;
          state.done=true;
        }
      }else state.restSeconds=0;
    }
    return state;
  }
  function finish(state,maxSteps=30000){
    for(let i=0;i<maxSteps&&!state.done;i++)advance(state,1/120);
    if(!state.done)throw Error('Die physikalische Simulation konnte nicht konvergieren.');
    return state;
  }
  const api=Object.freeze({create,advance,finish,sectorAt,buildPegAngles,REST_SPEED,REST_HOLD_SECONDS});
  root.CasinoWheelPhysics=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
