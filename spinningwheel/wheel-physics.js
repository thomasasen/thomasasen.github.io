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
  function create({angle=0,power=0,duration=6,coast=65,pointerIntensity=60,pointerSpring=65,geometry,random=Math.random}){
    if(!Array.isArray(geometry)||!geometry.length||!geometry.some(s=>s.size>0))
      throw Error('Keine sichtbaren Segmente vorhanden.');
    const pulse=Math.max(0,Math.min(1,power));
    const frictionScale=(6/Math.max(3,Math.min(30,duration)))*(1.1-.42*Math.max(0,Math.min(100,coast))/100);
    const initialSpeed=(420+900*pulse)*(.93+.14*random());
    const frictionVariance=.95+.1*random();
    const narrowest=geometry.reduce((minimum,s)=>s.size>0?Math.min(minimum,s.size):minimum,360);
    // Prevent a single pin from being struck repeatedly by tiny back/forth
    // numerical crossings. Adjacent distinct pins are still independent.
    const contactHysteresis=Math.min(.85,narrowest*.26);
    const state={
      angle,velocity:initialSpeed,initialSpeed,elapsed:0,contacts:0,done:false,restSeconds:0,
      lastSector:sectorAt(angle,geometry),lastImpactSpeed:0,lastContactAngle:null,contactHysteresis,
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
      // Smooth static-friction transition: use a Stribeck-like bearing curve
      // that tends continuously to zero at rest. A fixed Coulomb deceleration
      // gives a perceptible cutoff near the end, so we avoid it here.
      const bearing=39*speed/(speed+14);
      const viscous=speed*.075;
      const wind=speed*speed*.00023;
      // A soft, continuous safety drag prevents exceptionally long rotations.
      // It never terminates an otherwise moving wheel or changes its target.
      const overrun=Math.max(0,(state.elapsed/state.safetyStartSeconds)-.78);
      const safetyDrag=1+8*overrun*overrun;
      const loss=(bearing+viscous+wind)*state.frictionScale*safetyDrag*dt;
      const nextSpeed=Math.max(0,speed-loss);
      const nextVelocity=Math.sign(state.velocity)*nextSpeed;
      const nextAngle=state.angle+(state.velocity+nextVelocity)*.5*dt;
      const nextSector=sectorAt(nextAngle,state.geometry);
      if(nextSector>=0&&nextSector!==state.lastSector){
        const previousContact=state.lastContactAngle;
        const genuinelyNewContact=previousContact===null||
          Math.abs(nextAngle-previousContact)>state.contactHysteresis;
        if(genuinelyNewContact){
          state.lastContactAngle=nextAngle;
          state.contacts++;
          state.lastImpactSpeed=speed;
          const stiffness=.35+.65*state.pointerIntensity/100;
          // A slow collision may produce a gentle reversal. Above that speed,
          // a real clicking pawl removes only some kinetic energy; it cannot
          // reverse a fast-turning wheel abruptly.
          if(speed<9+9*stiffness){
            state.velocity=-nextVelocity*(.1+.1*state.pointerSpring/100);
          }else{
            state.velocity=nextVelocity*(1-(.0025+.013/(1+speed/135))*stiffness);
          }
          if(typeof onContact==='function')onContact(speed,state.contacts);
        }else state.velocity=nextVelocity;
      }else state.velocity=nextVelocity;
      state.angle=nextAngle;
      state.lastSector=nextSector;
      state.elapsed+=dt;
      // Motion is finished only after it is effectively stationary for a
      // sustained period; the winner is determined by the caller after done.
      // Contact rebounds reset the resting clock and are fully simulated.
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
  const api=Object.freeze({create,advance,finish,sectorAt,REST_SPEED,REST_HOLD_SECONDS});
  root.CasinoWheelPhysics=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
