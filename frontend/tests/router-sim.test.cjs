const fs=require('fs'),assert=require('node:assert/strict');
const path=require('node:path');
const root=path.resolve(__dirname,'..');const ts=require(root+'/node_modules/typescript');
require.extensions['.tsx']=require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,file);
const {sourceRouterPlan}=require(root+'/src/features/network-lab/teacherSourceCommands.ts');
const {getTeacherWalkthrough}=require(root+'/src/features/network-lab/teacherWalkthrough.ts');
const {buildTeacherExample}=require(root+'/src/features/network-lab/teacherLabs.ts');
const {runRouterCommand}=require(root+'/src/features/network-lab/routerCommands.ts');
const {runTeacherRouterCommand,routerRouteTable}=require(root+'/src/features/network-lab/routerCli.ts');
const {cdpNeighborTable}=require(root+'/src/features/network-lab/routerCommands.ts');
const {routerHelp}=require(root+'/src/features/network-lab/routerHelp.ts');
const {buildClickTutorActions}=require(root+'/src/features/network-lab/ClickTutor.tsx');
const {simulatePing}=require(root+'/src/features/network-lab/model.ts');
for(const id of ['week34-two-router-guide','week34-three-router-guide']){
 const plan=sourceRouterPlan(id),topology=buildTeacherExample(id),sessions={};
 for(const router of topology.devices.filter(d=>d.kind==='router')){router.name='Router';router.ripNetworks=[];for(const p of router.ports){p.ip='';p.enabled=false;delete p.clockRate;}}
 let dteErrors=0,repeatedErrors=0;
 for(const [phase,blocks] of [['configuration',plan.configuration],['routing',plan.routing]])for(const block of blocks){
  let state=sessions[block.deviceId]||{mode:'user',port:'F0/0'};
  for(const input of block.commands){
   const result=runRouterCommand(topology,block.deviceId,state,input,new Date(2026,9,21,6,0,0));assert(result, input);
   if(result.output.some(s=>s.includes('only to DCE')))dteErrors++;
   if(result.output.some(s=>s.includes('Invalid input'))) {assert.equal(phase,'routing');assert(['Ena','Conf t'].includes(input));repeatedErrors++;}
   topology.devices[topology.devices.findIndex(d=>d.id===block.deviceId)]=result.device;state=result.state;
  }
  sessions[block.deviceId]=state;
 }
 assert.equal(dteErrors,plan.configuration.length===3?3:1);assert.equal(repeatedErrors,plan.configuration.length===3?0:4);
 for(const block of plan.routing){assert.equal(sessions[block.deviceId].mode,'privileged');const routes=routerRouteTable(topology,block.deviceId);assert.equal(routes.filter(l=>/^[CR] /.test(l)).length,plan.configuration.length===3?6:3);assert(routes.some(l=>l.includes('[120/1] via 192.168.1.')));}
 if(plan.configuration.length===2){
  const disconnected=structuredClone(topology);delete disconnected.devices.find(d=>d.id==='r1').ports.find(p=>p.name==='S0/0').clockRate;
  assert.equal(routerRouteTable(disconnected,'r1').filter(l=>l.startsWith('R ')).length,0);
 }
 assert.doesNotThrow(()=>runTeacherRouterCommand(topology,'r1',{mode:'interface',port:'F0/1'},'ip add 192.168.1.1'));
 assert(simulatePing(topology,'pc1',topology.devices.find(d=>d.id==='pc2').ports[0].ip).ok);
 const guide=getTeacherWalkthrough(id).filter(s=>s.commandInput).flatMap(s=>s.commands);
 const expected=[...plan.configuration,...plan.routing].flatMap(b=>b.commands).concat(plan.routing.map(()=> 'Show ip route'));
 const clickActions=buildClickTutorActions(id,1);
 assert.deepEqual(clickActions.filter(s=>s.event==='submit' && s.value).map(s=>s.value),expected);
 const pc1Start=clickActions.findIndex(s=>s.selector==='[data-guide-device="pc1"]' && s.text.startsWith('Nhấp CHUỘT PHẢI vào hình PC1.'));
 const pc1Done=clickActions.findIndex(s=>s.selector==='[data-guide-host-ok]' && s.text.includes('PC1'));
 const pc2Start=clickActions.findIndex(s=>s.selector==='[data-guide-device="pc2"]' && s.text.startsWith('Nhấp CHUỘT PHẢI vào hình PC2.'));
 assert(pc1Start>=0 && pc1Done>pc1Start && pc2Start>pc1Done,'finish every PC1 Configs field before starting PC2');
 const r1Open=clickActions.findIndex(s=>s.event==='dblclick' && s.selector==='[data-guide-device="r1"]');
 const r2Open=clickActions.findIndex(s=>s.event==='dblclick' && s.selector==='[data-guide-device="r2"]');
 const firstRip=clickActions.findIndex(s=>s.event==='submit' && s.value==='Router RIP');
 const lastHostDone=clickActions.reduce((last,s,index)=>s.selector==='[data-guide-host-ok]'?index:last,-1);
 const configuredBeforePc2=clickActions.slice(0,pc2Start).filter(s=>s.event==='submit' && s.value).map(s=>s.value);
 assert(r1Open>pc1Done && r2Open>r1Open && pc2Start>r2Open && firstRip>pc2Start,
  'walk left to right: finish PC1, then configure R1 and R2 interfaces, then PC2, then RIP');
 assert(firstRip>lastHostDone,'finish configuring every host before starting RIP');
 assert.deepEqual(configuredBeforePc2,plan.configuration.flatMap(block=>block.commands),
  'finish every router interface command from the teacher source before starting PC2');
 assert.deepEqual(clickActions.slice(pc1Start+1,pc1Done).map(s=>s.selector),[
  '[data-guide-config]','[data-guide-field="Host Name"] input','[data-guide-manual-ip]',
  ...['IP Address','Subnet','Default Gateway'].flatMap(label=>[1,2,3,4].map(octet=>`input[aria-label="${label} octet ${octet}"]`)),
 ]);
 const pc1Example=buildTeacherExample(id).devices.find(d=>d.id==='pc1');
 assert.deepEqual(clickActions.slice(pc1Start+1,pc1Done).filter(s=>s.event==='input').map(s=>s.value),[
  'PC1',...pc1Example.ports[0].ip.split('.'),...pc1Example.ports[0].mask.split('.'),...pc1Example.gateway.split('.'),
 ],'finish PC1 IP, subnet mask and gateway octet by octet before PC2');
 assert(clickActions[pc1Start].text.includes(`IP ${pc1Example.ports[0].ip}; subnet ${pc1Example.ports[0].mask}`));
 assert(clickActions[pc2Start].text.includes(`IP ${buildTeacherExample(id).devices.find(d=>d.id==='pc2').ports[0].ip}`),'show PC2 IP before entering its configuration');
 assert.deepEqual(guide,expected);assert(!guide.some(c=>/write|exit|ping/i.test(c)));

 console.log(id,': complete teacher replay, all routes and connectivity passed; DTE/repeated-command errors verified.');
}

// Compare actual native console responses for every source command in lab 3.
function checkNativeFixture(fixture,labId) {
const plan=sourceRouterPlan(labId);
const topo=buildTeacherExample(labId);
for(const router of topo.devices.filter(d=>d.kind==='router')){router.name='Router';router.ripNetworks=[];for(const p of router.ports){p.ip='';p.enabled=false;delete p.clockRate;}}
const states={};const responses={};
for(const [id,text] of Object.entries(fixture.console)){
 const chunks=text.split(/^(?:Router|R[123])(?:\(config(?:-if|-router)?\))?[>#]/m).slice(1);
 responses[id]=chunks.filter(c=>c.trim()).map(c=>{const [command,...output]=c.split('\n');return {command:command.trim(),output:output.map(s=>s.trimEnd()).filter(s=>s.trim())};});
}
const normalize=lines=>lines.map(s=>s.replace(/^\d{2}:\d{2}:\d{2} /,'TIME ').replace(/, \d{2}:\d{2}:\d{2}, /,', AGE, ')).filter(s=>s.trim());
for(const block of [...plan.configuration,...plan.routing]){
 let state=states[block.deviceId]||{mode:'user',port:'F0/0'};
 for(const command of block.commands){
  const captured=responses[block.deviceId].shift();assert.equal(captured.command.toLowerCase(),command.toLowerCase());
  const result=runRouterCommand(topo,block.deviceId,state,command);assert(result);
  assert.deepEqual(normalize(result.output),normalize(captured.output),`${block.name}: ${command}`);
  topo.devices[topo.devices.findIndex(d=>d.id===block.deviceId)]=result.device;state=result.state;
 }
 states[block.deviceId]=state;
}
for(const block of plan.routing){
 const captured=responses[block.deviceId].shift();assert.equal(captured.command,'Show ip route');
 const actual=normalize(routerRouteTable(topo,block.deviceId));const expected=normalize(captured.output);
 assert.deepEqual(actual.filter(s=>!s.startsWith('R ')).sort(),expected.filter(s=>!s.startsWith('R ')).sort());
 // Equal-cost RIP next hops depend on update arrival order in the native app.
 assert.deepEqual(actual.filter(s=>s.startsWith('R ')).map(s=>s.split(' [')[0]).sort(),expected.filter(s=>s.startsWith('R ')).map(s=>s.split(' [')[0]).sort());
}
console.log(labId+': every command response matches native console; route networks and connected interfaces match.');
}
checkNativeFixture(require('./fixtures/router-sim-native.json'),'week34-three-router-guide');
checkNativeFixture(require('./fixtures/router-sim-native-lab2.json'),'week34-two-router-guide');

// Saving startup configuration must not alias the mutable running configuration.
{
 const topology=buildTeacherExample('week34-two-router-guide');const id='r1';let state={mode:'privileged',port:'F0/1'};
 const apply=input=>{const result=runRouterCommand(topology,id,state,input);assert(result,input);state=result.state;topology.devices[topology.devices.findIndex(d=>d.id===id)]=result.device;return result;};
 assert(apply('sh run').output.some(line=>line==='hostname R1'));
 const originalStartup=apply('sh start').output;assert(originalStartup.some(line=>line==='hostname Router'));
 apply('wr');apply('conf t');apply('hostname AFTER_SAVE');apply('int f0/1');apply('ip add 192.168.1.2 255.255.255.192');apply('end');
 assert(apply('show running-config').output.some(line=>line==='hostname AFTER_SAVE'));
 assert(apply('show startup-config').output.some(line=>line==='hostname R1'));
 assert(!apply('show startup-config').output.some(line=>line.includes('192.168.1.2 ')));
 const copy=apply('copy run start');assert.equal(copy.state.pending,'copy-startup');assert(!copy.output.includes('[OK]'));
 apply('');assert(apply('show startup-config').output.some(line=>line==='hostname AFTER_SAVE'));
 assert(apply('ping 192.168.1.150').output.includes('!!!'));
 assert(!apply('ping 192.168.1.150').output.some(line=>line.startsWith('Pinging')));
 assert(apply('show ip int br').output.some(line=>line.startsWith('FastEthernet0/1')));
 topology.devices.filter(d=>d.kind==='router').forEach(d=>{d.ripNetworks=['192.168.1.0'];});
 assert.equal(routerRouteTable(topology,id).filter(line=>line.startsWith('R ')).length,1,'one classful RIP network covers its subnets');
 console.log('Startup snapshots, interactive copy, abbreviations, native router ping and classful RIP passed.');
}

{
 const topology=buildTeacherExample('week34-two-router-guide');
 const check=(command)=>runRouterCommand(topology,'r1',{mode:'interface',port:'F0/1'},command);
 assert.deepEqual(check('ip add').output,['% Incomplete command.']);
 assert.deepEqual(check('ip add 192.168.1.2').output,['% Incomplete command.']);
 assert.deepEqual(check('ip add 192.168.1.2 255.0.255.0').output,['Bad mask/8 for address 192.168.1.2']);
 assert.deepEqual(check('ip add 192.168.1.0 255.255.255.192').output,['Bad mask/26 for address 192.168.1.0']);
 assert.deepEqual(check('ip add 192.168.1.65 255.255.255.192').output,['% 192.168.1.64 overlaps with Serial0/0']);
 assert.equal(check('ip add 192.168.1.65 255.255.255.192').device.ports.find(p=>p.name==='F0/1').ip,topology.devices.find(d=>d.id==='r1').ports.find(p=>p.name==='F0/1').ip,'rejected address must not change the interface');
 const rates=routerHelp('interface','clock rate?');assert(rates.includes('        Speed (bits per second)'));assert(rates.includes('  64000'));assert.equal(rates.at(-1),'  1000000');
 const neighbors=cdpNeighborTable(topology,'r2');assert(neighbors[0].startsWith('Capability Codes:'));assert(neighbors.some(line=>line.startsWith('R1')));assert(!neighbors.some(line=>line.startsWith('PC')));
 console.log('Native incomplete IP, bad mask, overlap, clock-rate help and CDP neighbor responses passed.');
}

{
 const {runHostCommand}=require(root+'/src/features/network-lab/hostCommands.ts');const topology=buildTeacherExample('week34-two-router-guide');
 const captured=require('./fixtures/host-console-native.json');
 for(const [command,expected] of Object.entries(captured))assert.deepEqual(runHostCommand(topology,'pc1',command).output.filter(line=>line.trim()),expected.filter(line=>line.trim()),command);
 assert(runHostCommand(topology,'pc1','exit').close);
 console.log('Host commands match native Windows 2000 console captures, including unsupported ipconfig, ping, tracert and default telnet.');
}
