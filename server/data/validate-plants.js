const fs=require('fs'),path=require('path');
const dir=path.join(__dirname,'plants');
const regions=new Set(JSON.parse(fs.readFileSync(path.join(__dirname,'regions.json'))).map(r=>r.name));
const A={archetype:['herb','shrub','tree','rosette','grass','vine','rhizome','aquatic'],shape:['ovate','lanceolate','round','heart','pinnate','needle','blade','spike','trifoliate'],type:['herb','shrub','tree','climber','grass','succulent','aquatic','rhizome','bulb'],kp:['leaf','flower','fruit','root','bark','seed'],dosha:['decreases','increases','neutral'],ab:['wild','common','cultivated','rare']};
let bad=0,n=0;const hex=/^#[0-9a-fA-F]{6}$/;
for(const f of fs.readdirSync(dir).filter(f=>f.endsWith('.json'))){
 const e=[];let p;try{p=JSON.parse(fs.readFileSync(path.join(dir,f)))}catch(x){console.log(f,'INVALID JSON',x.message);bad++;continue}
 n++;
 for(const k of ['slug','common_name','botanical_name','family','description','cultural_significance','precautions'])if(!p[k]||typeof p[k]!=='string')e.push('missing '+k);
 if(p.slug+'.json'!==f)e.push('slug/filename mismatch');
 if(!A.type.includes(p.plant_type))e.push('plant_type');
 for(const k of ['other_names','ayush_systems','parts_used','ailments','uses','preparations','chemistry','regions'])if(!Array.isArray(p[k])||!p[k].length)e.push('empty '+k);
 const a=p.ayurveda||{};if(!a.rasa||!a.virya||!a.vipaka||!a.doshas)e.push('ayurveda incomplete');else for(const d of['vata','pitta','kapha'])if(!A.dosha.includes(a.doshas[d]))e.push('dosha '+d);
 (p.regions||[]).forEach(r=>{if(!regions.has(r.name))e.push('bad region '+r.name);if(!A.ab.includes(r.abundance))e.push('abundance')});
 const m=p.model_spec||{};if(!A.archetype.includes(m.archetype))e.push('archetype');if(!m.leaf||!A.shape.includes(m.leaf.shape)||!hex.test(m.leaf.color))e.push('leaf spec');if(!hex.test(m.stem||''))e.push('stem');if(!A.kp.includes(m.key_part))e.push('key_part');
 if(m.flower&&!hex.test(m.flower.color))e.push('flower color');if(m.fruit&&!hex.test(m.fruit.color))e.push('fruit color');if(m.root&&!hex.test(m.root.color))e.push('root color');
 if(e.length){bad++;console.log(f,e.join('; '))}
}
console.log(n+' files, '+bad+' with problems');process.exit(bad?1:0);
