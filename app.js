const appState={persons:[],pid:1,tid:1,meetings:[],mid:1}
const API_BASE='/api'
const LS_KEY='ToDoTaskList_state'
const qs=s=>document.querySelector(s)
const personInput=qs('#person-title-input')
const addPersonBtn=qs('#add-person-btn')
const container=qs('#person-list-container')
const themeToggle=null
const searchInput=qs('#search-input')
const statusFilter=qs('#status-filter')
const priorityFilter=qs('#priority-filter')
const filters={query:'',status:'all',priority:'all'}
const navTodo=qs('#nav-todo')
const navMeet=qs('#nav-meet')
const todoPage=qs('#todo-page')
const meetPage=qs('#meeting-page')
function createEl(tag,cls){const el=document.createElement(tag);if(cls)el.className=cls;return el}
let saveTimer=null
async function apiLoad(){try{const r=await fetch(`${API_BASE}/state`);if(!r.ok)return null;return await r.json()}catch(e){return null}}
async function apiSave(){try{await fetch(`${API_BASE}/state`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({persons:appState.persons,pid:appState.pid,tid:appState.tid,meetings:appState.meetings,mid:appState.mid})})}catch(e){} }
function save(){if(saveTimer)clearTimeout(saveTimer);saveTimer=setTimeout(apiSave,400)}
async function load(){const s=await apiLoad();if(s){appState.persons=s.persons||[];appState.pid=s.pid||1;appState.tid=s.tid||1;appState.meetings=s.meetings||[];appState.mid=s.mid||1}}
function addPerson(title){const id=appState.pid++
const person={id,title:title&&title.trim()?title.trim():`Kişi ${id} ToDoList`,tasks:[]}
appState.persons.push(person)
renderPerson(person)
save()
}
function renderPerson(person){const card=createEl('section','person-card');card.dataset.pid=person.id
const header=createEl('div','person-card-header')
const titleInput=createEl('input','person-title');titleInput.value=person.title
const headerActions=createEl('div','task-actions')
const headerMenuBtn=createEl('button','menu-btn');headerMenuBtn.innerHTML='<span class="bar"></span><span class="bar"></span><span class="bar"></span>'
const headerMenuList=createEl('div','menu-list')
const clearTasksBtn=createEl('button');clearTasksBtn.textContent='Tüm Görevleri Temizle'
const deletePersonBtn=createEl('button','delete');deletePersonBtn.textContent='Kişiyi Sil'
headerMenuList.appendChild(clearTasksBtn);headerMenuList.appendChild(deletePersonBtn)
headerActions.appendChild(headerMenuBtn);headerActions.appendChild(headerMenuList)
const taskAdd=createEl('div','task-add')
const taskInput=createEl('input');taskInput.placeholder='Görev açıklaması'
const priority=createEl('select','task-priority')
;['low','medium','high'].forEach(k=>{const o=document.createElement('option');o.value=k;o.textContent=k==='low'?'Düşük':k==='medium'?'Orta':'Yüksek';priority.appendChild(o)})
priority.value='medium'
const taskBtn=createEl('button');taskBtn.textContent='Görev Ekle'
const list=createEl('ul','task-list')
const stats=createEl('div','person-stats')
const completedSection=createEl('div','completed-section collapsed')
const completedHeader=createEl('div','completed-header')
const completedTitle=createEl('span');completedTitle.textContent='Tamamlanan Görevler'
const completedCount=createEl('span','count');completedCount.textContent='(0)'
completedHeader.appendChild(completedTitle);completedHeader.appendChild(completedCount)
const doneList=createEl('ul','completed-list')
completedSection.appendChild(completedHeader);completedSection.appendChild(doneList)
header.appendChild(titleInput);header.appendChild(headerActions)
taskAdd.appendChild(taskInput);taskAdd.appendChild(priority);taskAdd.appendChild(taskBtn)
card.appendChild(header);card.appendChild(stats);card.appendChild(taskAdd);card.appendChild(list);card.appendChild(completedSection)
container.appendChild(card)
titleInput.addEventListener('input',e=>{person.title=e.target.value;save();applyFilters()})
headerMenuBtn.addEventListener('click',e=>{e.stopPropagation();headerMenuList.classList.toggle('open')})
document.addEventListener('click',()=>{headerMenuList.classList.remove('open')})
clearTasksBtn.addEventListener('click',()=>{person.tasks.splice(0,person.tasks.length);list.innerHTML='';const doneListEl=card.querySelector('.completed-list');if(doneListEl)doneListEl.innerHTML='';renderEmpty(list);save();updateStats(person);headerMenuList.classList.remove('open')})
deletePersonBtn.addEventListener('click',()=>{const idx=appState.persons.findIndex(p=>p.id===person.id);if(idx>-1){appState.persons.splice(idx,1);card.remove();save()} headerMenuList.classList.remove('open')})
taskBtn.addEventListener('click',()=>{const txt=taskInput.value.trim();if(!txt)return;const pr=priority.value;taskInput.value='';addTask(person,list,txt,pr)})
taskInput.addEventListener('keydown',e=>{if(e.key==='Enter'){taskBtn.click()}})
renderEmpty(list)
person.tasks.forEach(t=>{(t.completed?renderTask(person,doneList,t):renderTask(person,list,t))})
completedHeader.addEventListener('click',()=>{completedSection.classList.toggle('collapsed')})
updateStats(person)
card.draggable=true
card.addEventListener('dragstart',()=>{card.classList.add('dragging')})
card.addEventListener('dragend',()=>{card.classList.remove('dragging');reorderPersonsFromDOM();save()})
list.addEventListener('dragover',e=>{e.preventDefault();const dragging=list.querySelector('.task-item.dragging');if(!dragging)return;const after=getTaskAfterElement(list,e.clientY);if(after==null){list.appendChild(dragging)}else{list.insertBefore(dragging,after)}})
}
function renderEmpty(list){const empty=list.querySelector('.empty');if(empty)empty.remove()}
function addTask(person,list,text,priority){const task={id:appState.tid++,text,completed:false,priority,completedAt:null,notes:''};person.tasks.push(task);renderTask(person,list,task);save();updateStats(person)}
function renderTask(person,list,task){const li=createEl('li','task-item');li.dataset.tid=task.id;li.classList.add(`priority-${task.priority}`);if(task.completed)li.classList.add('completed')
const cb=createEl('input','task-checkbox');cb.type='checkbox';cb.checked=task.completed
const span=createEl('span','task-text');span.textContent=task.text
const meta=createEl('span','task-meta')
if(task.completedAt){meta.textContent=new Date(task.completedAt).toLocaleString('tr-TR',{dateStyle:'short',timeStyle:'short'})}
const actions=createEl('div','task-actions')
const menuBtn=createEl('button','menu-btn');menuBtn.innerHTML='<span class="bar"></span><span class="bar"></span><span class="bar"></span>'
const menuList=createEl('div','menu-list')
const editItem=createEl('button');editItem.textContent='Düzenle'
const delItem=createEl('button','delete');delItem.textContent='Sil'
menuList.appendChild(editItem);menuList.appendChild(delItem)
actions.appendChild(menuBtn);actions.appendChild(menuList)
const noteBtn=createEl('button','note-btn');noteBtn.textContent='Not'
li.appendChild(cb);li.appendChild(span);li.appendChild(meta);li.appendChild(actions);li.appendChild(noteBtn)
list.appendChild(li)
const notes=createEl('div','task-notes')
const ta=createEl('textarea')
ta.placeholder='Açıklama / Not'
ta.value=(task.notes||'')
notes.appendChild(ta)
li.appendChild(notes)
li.draggable=true
li.addEventListener('dragstart',()=>{li.classList.add('dragging')})
li.addEventListener('dragend',()=>{li.classList.remove('dragging');reorderTasksFromDOM(person,list);save()})
cb.addEventListener('change',e=>{task.completed=e.target.checked;task.completedAt=task.completed?new Date().toISOString():null;li.classList.toggle('completed',task.completed);meta.textContent=task.completedAt?new Date(task.completedAt).toLocaleString('tr-TR',{dateStyle:'short',timeStyle:'short'}):'';const card=li.closest('.person-card');const active=card.querySelector('.task-list');const done=card.querySelector('.completed-list');if(task.completed){done.appendChild(li)}else{active.appendChild(li)}save();updateStats(person)})
menuBtn.addEventListener('click',e=>{e.stopPropagation();menuList.classList.toggle('open')})
document.addEventListener('click',()=>{menuList.classList.remove('open')})
editItem.addEventListener('click',()=>{const v=prompt('Görev metni',task.text);if(v!==null){const t=v.trim();if(t){task.text=t;span.textContent=t;save()} } menuList.classList.remove('open')})
delItem.addEventListener('click',()=>{const idx=person.tasks.findIndex(x=>x.id===task.id);if(idx>-1){person.tasks.splice(idx,1);li.remove();renderEmpty(list);save();applyFilters();updateStats(person)} menuList.classList.remove('open')})
noteBtn.addEventListener('click',()=>{notes.classList.toggle('open');if(notes.classList.contains('open')){ta.focus()}})
noteBtn.classList.toggle('has-note',Boolean((task.notes||'').trim()))
ta.addEventListener('input',()=>{task.notes=ta.value;noteBtn.classList.toggle('has-note',Boolean((task.notes||'').trim()));save()})
}
addPersonBtn.addEventListener('click',()=>{addPerson(personInput.value);personInput.value=''})
async function init(){await load();container.innerHTML='';if(appState.persons.length){appState.persons.forEach(p=>renderPerson(p))}applyFilters();if(appState.meetings.length){appState.meetings.forEach(renderMeeting);updatePastCount();[...new Set(appState.meetings.filter(x=>!x.done).map(x=>x.date))].forEach(updateDayCount)}}
init()
setInterval(async()=>{const s=await apiLoad();if(!s)return;const changed=JSON.stringify({persons:appState.persons,meetings:appState.meetings})!==JSON.stringify({persons:s.persons,meetings:s.meetings});if(changed){appState.persons=s.persons||[];appState.pid=s.pid||1;appState.tid=s.tid||1;appState.meetings=s.meetings||[];appState.mid=s.mid||1;container.innerHTML='';if(appState.persons.length){appState.persons.forEach(renderPerson)}applyFilters();const meetingGroupsEl=document.querySelector('#meeting-groups');if(meetingGroupsEl)meetingGroupsEl.innerHTML='';const pastListEl=document.querySelector('#past-list');if(pastListEl)pastListEl.innerHTML='';if(appState.meetings.length){appState.meetings.forEach(renderMeeting);updatePastCount();[...new Set(appState.meetings.filter(x=>!x.done).map(x=>x.date))].forEach(updateDayCount)}}},5000)
container.addEventListener('dragover',e=>{e.preventDefault();const dragging=document.querySelector('.person-card.dragging');if(!dragging)return;const after=getCardAfterElement(container,e.clientY);if(after==null){container.appendChild(dragging)}else{container.insertBefore(dragging,after)}})
const getTaskAfterElement=(list,y)=>{const els=[...list.querySelectorAll('.task-item:not(.dragging)')];let closest={offset:Number.NEGATIVE_INFINITY,element:null};els.forEach(child=>{const box=child.getBoundingClientRect();const offset=y-box.top-box.height/2;if(offset<0&&offset>closest.offset){closest={offset,element:child}}});return closest.element}
const reorderTasksFromDOM=(person,list)=>{const ids=[...list.querySelectorAll('.task-item')].map(li=>Number(li.dataset.tid)).filter(id=>!isNaN(id));person.tasks=ids.map(id=>person.tasks.find(t=>t.id===id)).filter(Boolean)}
const getCardAfterElement=(container,y)=>{const els=[...container.querySelectorAll('.person-card:not(.dragging)')];let closest={offset:Number.NEGATIVE_INFINITY,element:null};els.forEach(child=>{const box=child.getBoundingClientRect();const offset=y-box.top-box.height/2;if(offset<0&&offset>closest.offset){closest={offset,element:child}}});return closest.element}
const reorderPersonsFromDOM=()=>{const ids=[...container.querySelectorAll('.person-card')].map(c=>Number(c.dataset.pid));appState.persons=ids.map(id=>appState.persons.find(p=>p.id===id)).filter(Boolean)}
if(searchInput){searchInput.addEventListener('input',e=>{filters.query=e.target.value.toLowerCase();applyFilters()})}
if(statusFilter){statusFilter.addEventListener('change',e=>{filters.status=e.target.value;applyFilters()})}
if(priorityFilter){priorityFilter.addEventListener('change',e=>{filters.priority=e.target.value;applyFilters()})}
function applyFilters(){const q=filters.query;const st=filters.status;const pr=filters.priority;document.querySelectorAll('.person-card').forEach(card=>{const pid=Number(card.dataset.pid);const person=appState.persons.find(p=>p.id===pid);const titleMatch=q?person.title.toLowerCase().includes(q):true;let visible=0;card.querySelectorAll('.task-item').forEach(li=>{const tid=Number(li.dataset.tid);const t=person.tasks.find(x=>x.id===tid);let match=true;if(q)match=(t.text.toLowerCase().includes(q)||titleMatch);if(st!=='all')match=match&&((st==='done'&&t.completed)||(st==='todo'&&!t.completed));if(pr!=='all')match=match&&(t.priority===pr);li.style.display=match?'':'none';if(match)visible++});card.style.display=(q&&!titleMatch&&visible===0)?'none':''})}
function updateStats(person){const card=document.querySelector(`.person-card[data-pid="${person.id}"]`);if(!card)return;const statsEl=card.querySelector('.person-stats');const doneCountEl=card.querySelector('.completed-header .count');const total=person.tasks.length;const done=person.tasks.filter(t=>t.completed).length;const todo=total-done;if(statsEl)statsEl.textContent=`Toplam: ${total} • Tamamlanan: ${done} • Bekleyen: ${todo}`;if(doneCountEl)doneCountEl.textContent=`(${done})`}
const mDate=qs('#meeting-date-input')
const mTitle=qs('#meeting-title-input')
const mLoc=qs('#meeting-location-input')
const mTime=qs('#meeting-time-input')
const mPeople=qs('#meeting-people-input')
const addMeetingBtn=qs('#add-meeting-btn')
const meetingGroups=qs('#meeting-groups')
const pastSection=qs('.past-section')
const pastHeader=qs('.past-header')
const pastList=qs('#past-list')
function addMeeting(data){const id=appState.mid++;const item={id,title:data.title||'',date:data.date||todayStr(),location:data.location||'',time:data.time||'',people:data.people||'',done:false};appState.meetings.push(item);renderMeeting(item);updateDayCount(item.date);save()}
function renderMeeting(m){const li=createEl('li','meeting-item');li.dataset.mid=m.id
updateMeetingItemClass(li,m)
const info=createEl('div','meeting-info');info.textContent=`Tarih: ${m.date} • Toplantı: ${m.title} • Konum: ${m.location} • Saat: ${m.time} • Kimler: ${m.people}`
const actions=createEl('div','meeting-actions')
const doneBtn=createEl('button');doneBtn.textContent=m.done?'Geri Al':'Yapıldı'
const del=createEl('button');del.textContent='Sil'
actions.appendChild(doneBtn);actions.appendChild(del)
  li.appendChild(info);li.appendChild(actions)
  const targetList = m.done ? pastList : ensureDayGroup(m.date);targetList.appendChild(li)
 doneBtn.addEventListener('click',()=>{const prevDate=m.date;m.done=!m.done;doneBtn.textContent=m.done?'Geri Al':'Yapıldı';updateMeetingItemClass(li,m);if(m.done){pastList.appendChild(li)}else{ensureDayGroup(m.date).appendChild(li)}save();updatePastCount();updateDayCount(prevDate);updateDayCount(m.date)})
 del.addEventListener('click',()=>{const idx=appState.meetings.findIndex(x=>x.id===m.id);if(idx>-1){appState.meetings.splice(idx,1);li.remove();save();updatePastCount();updateDayCount(m.date);removeEmptyDayGroup(m.date)}})
 doneBtn.addEventListener('click',()=>{sortDayGroups();decorateDayHeaders()})
}
function todayStr(){const d=new Date();const y=d.getFullYear();const m=String(d.getMonth()+1).padStart(2,'0');const day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`}
function tomorrowStr(){const d=new Date();d.setDate(d.getDate()+1);const y=d.getFullYear();const m=String(d.getMonth()+1).padStart(2,'0');const day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`}
function labelForDate(date){const t=todayStr();const tm=tomorrowStr();if(date===t)return 'Bugün';if(date===tm)return 'Yarın';try{const parts=date.split('-');const d=new Date(Number(parts[0]),Number(parts[1])-1,Number(parts[2]));return d.toLocaleDateString('tr-TR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}catch(e){return date}}
function updateMeetingItemClass(li,m){li.classList.remove('today','future','done');if(m.done){li.classList.add('done');return}const t=todayStr();if(m.date===t){li.classList.add('today')}else if(m.date>t){li.classList.add('future')}}
function ensureDayGroup(date){let group=meetingGroups.querySelector(`.day-group[data-date="${date}"]`);if(!group){group=createEl('div','day-group');group.dataset.date=date;const header=createEl('div','day-header');const title=createEl('span');title.textContent=labelForDate(date);const count=createEl('span','count');count.textContent='(0)';header.appendChild(title);header.appendChild(count);const ul=createEl('ul','meeting-list');group.appendChild(header);group.appendChild(ul);meetingGroups.appendChild(group)}return group.querySelector('.meeting-list')}
function updateDayCount(date){const group=meetingGroups.querySelector(`.day-group[data-date="${date}"]`);if(!group)return;const countEl=group.querySelector('.day-header .count');if(!countEl)return;const c=appState.meetings.filter(x=>!x.done&&x.date===date).length;countEl.textContent=`(${c})`}
function removeEmptyDayGroup(date){const group=meetingGroups.querySelector(`.day-group[data-date="${date}"]`);if(!group)return;const c=appState.meetings.filter(x=>!x.done&&x.date===date).length;if(c===0)group.remove()}
function updatePastCount(){const c=appState.meetings.filter(x=>x.done).length;const countEl=document.querySelector('.past-header .count');if(countEl)countEl.textContent=`(${c})`}
if(addMeetingBtn){addMeetingBtn.addEventListener('click',()=>{const data={date:mDate.value||todayStr(),title:mTitle.value.trim(),location:mLoc.value.trim(),time:mTime.value,people:mPeople.value.trim()};if(!data.title&&!data.location&&!data.time&&!data.people)return;addMeeting(data);updateDayCount(data.date);mDate.value='';mTitle.value='';mLoc.value='';mTime.value='';mPeople.value=''})}
if(appState.meetings.length){appState.meetings.forEach(renderMeeting);updatePastCount();[...new Set(appState.meetings.filter(x=>!x.done).map(x=>x.date))].forEach(updateDayCount)}
if(pastHeader){pastHeader.addEventListener('click',()=>{pastSection.classList.toggle('collapsed')})}
function showPage(name){if(name==='todo'){todoPage.classList.add('active');meetPage.classList.remove('active');navTodo.classList.add('active');navMeet.classList.remove('active')}else{meetPage.classList.add('active');todoPage.classList.remove('active');navMeet.classList.add('active');navTodo.classList.remove('active')}}
if(navTodo){navTodo.addEventListener('click',()=>showPage('todo'))}
if(navMeet){navMeet.addEventListener('click',()=>showPage('meet'))}