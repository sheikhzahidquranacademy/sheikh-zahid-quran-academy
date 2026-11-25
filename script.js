const WHATSAPP_NUMBER = '971525908695';
const academyEmail = 'sheikhzahidquranacademy@gmail.com';
// Paste the deployed Google Apps Script Web App URL here after one-time setup.
const FORM_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzBI6AQlmy-lC7SUEthf0RiA1svvRUXo04w95dYj1rho5bAnAIBTqOToTycAQtj5CQ/exec';
// Optional: deploy the included Cloudflare Worker chatbot and paste its URL here.
const CHATBOT_ENDPOINT = '';
// Student Reviews use the existing Google Apps Script Web App; no separate Worker is needed.
const REVIEWS_ENDPOINT = FORM_ENDPOINT;

const toggle = document.querySelector('.menu-toggle');
const navs = [...document.querySelectorAll('.nav')];
toggle?.addEventListener('click', () => {
  const open = navs[0].classList.toggle('open');
  navs[1].classList.toggle('open', open);
  toggle.setAttribute('aria-expanded', String(open));
  toggle.textContent = open ? '✕' : '☰';
});
navs.forEach(nav => nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  navs.forEach(item => item.classList.remove('open'));
  toggle?.setAttribute('aria-expanded', 'false');
  if (toggle) toggle.textContent = '☰';
})));
const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

function openWhatsApp(message) {
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
function formObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}
function requestMessage(data) {
  const labels = {studentName:'Student Name',email:'Email Address',whatsapp:'WhatsApp Number',country:'Country',age:'Age Group',course:'Course',teacherPreference:'Teacher Preference',teacherLocation:'Teacher Location',classTime:'Preferred Class Time',message:'Additional Message'};
  return ['Assalamu Alaikum! I would like to request a FREE TRIAL CLASS.','',...Object.entries(data).filter(([,v])=>String(v).trim()).map(([k,v])=>`${labels[k]||k}: ${v}`),'','Sheikh Zahid Quran Academy'].join('\n');
}
document.getElementById('trialForm')?.addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const data = formObject(form);
  const note = document.getElementById('formNote');
  const button = form.querySelector('button[type="submit"]');
  if (FORM_ENDPOINT) {
    button.disabled = true; button.textContent = 'Submitting…';
    try {
      const response = await fetch(FORM_ENDPOINT, {method:'POST', mode:'cors', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify(data)});
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Submission failed');
      note.textContent = 'Thank you! Your request has been received. A confirmation email will be sent to you.';
      form.reset();
    } catch (error) {
      note.textContent = 'Online submission could not be completed. WhatsApp has been opened as a backup; please press Send.';
      openWhatsApp(requestMessage(data));
    } finally { button.disabled = false; button.innerHTML = '➤ &nbsp; REQUEST FREE TRIAL'; }
  } else {
    note.textContent = 'Online email/record system is awaiting its one-time Google setup. WhatsApp has opened as a backup; please press Send.';
    openWhatsApp(requestMessage(data));
  }
});
async function loadPublicReviews(){
  const host=document.getElementById('publicReviews'); if(!host || !REVIEWS_ENDPOINT) return;
  try{const r=await fetch(`${REVIEWS_ENDPOINT}?action=publicReviews`); if(!r.ok) throw new Error('Could not load reviews'); const data=await r.json();
    host.replaceChildren(); (data.reviews||[]).forEach(item=>{const card=document.createElement('article');card.className='public-review';const name=document.createElement('strong');name.textContent=item.first_name;const course=document.createElement('small');course.textContent=item.course;const body=document.createElement('p');body.textContent=item.review;card.append(name,course,body);host.append(card);});
    if(!(data.reviews||[]).length) host.textContent='Be the first to share your learning experience.';
  }catch(e){host.textContent='Student reviews are temporarily unavailable.';}
}
document.getElementById('reviewForm')?.addEventListener('submit', async event => {
  event.preventDefault(); const form=event.currentTarget; if(!form.reportValidity()) return;
  const data=formObject(form), note=document.getElementById('reviewNote'), button=form.querySelector('button[type="submit"]');
  if(!REVIEWS_ENDPOINT){note.textContent='Review submission is temporarily unavailable. Please contact the academy on WhatsApp.';return;}
  button.disabled=true; button.textContent='Submitting…';
  try{const r=await fetch(REVIEWS_ENDPOINT,{method:'POST',mode:'cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'submitReview',firstName:data.reviewName,course:data.reviewCourse,review:data.reviewText})});const result=await r.json();if(!r.ok||!result.success)throw new Error(result.message||'Submission failed');note.textContent=result.status==='approved'?'Thank you! Your review has been published.':'Thank you! Your review has been received and is awaiting academy approval.';form.reset();await loadPublicReviews();}
  catch(e){note.textContent='We could not submit your review right now. Please try again later or contact us on WhatsApp.';}
  finally{button.disabled=false;button.textContent='Submit Review ›';}
});
loadPublicReviews();

// Academy assistant: accurate approved FAQ responses; optional AI endpoint can be connected later.
const answers = [
  [/course|class|offer/i,'We offer Noorani Qaida, Quran Nazra, Hifz-ul-Quran, Tajweed, Quran Tafseer, Arabic Language, Islamic Studies and Adult Education.'],
  [/package|fee|price|cost/i,'We offer separate monthly packages for Pakistan-based and UK-based teachers. Please submit the Free Trial form so our team can confirm the current package for your preferred schedule.'],
  [/trial|free|admission|join|enrol/i,'You can request one free trial class using the Free Trial form on this page. Please share the student details and preferred timing.'],
  [/female|male|teacher|gender/i,'You may request a male or female teacher. Pakistan-based and UK-based teacher options are available, subject to availability.'],
  [/time|timezone|schedule/i,'Class timings are arranged around the student’s local time zone and availability.'],
  [/record|progress|report/i,'Class recordings are not provided. Monthly progress reports are shared.'],
  [/language/i,'Teaching and communication options include English, Urdu and Arabic, subject to teacher availability.'],
  [/contact|whatsapp|email/i,`You can contact the academy on WhatsApp at +971 52 590 8695 or email ${academyEmail}.`]
];
async function getAnswer(question) {
  if (CHATBOT_ENDPOINT) {
    try {
      const r = await fetch(CHATBOT_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question})});
      const j = await r.json(); if (j.answer) return j.answer;
    } catch(e) {}
  }
  const match = answers.find(([pattern])=>pattern.test(question));
  return match ? match[1] : 'Thank you for your question. For a confirmed answer about availability or your individual needs, please contact us on WhatsApp at +971 52 590 8695 or use the Free Trial form.';
}
const panel=document.getElementById('chatPanel'), launcher=document.getElementById('chatLauncher');
function chatOpen(){panel.hidden=false;launcher.style.display='none';}
function chatClose(){panel.hidden=true;launcher.style.display='flex';}
launcher?.addEventListener('click',chatOpen);
launcher?.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();chatOpen();}});
document.getElementById('chatClose')?.addEventListener('click',chatClose);
function addChatMessage(text,who){const p=document.createElement('p');p.className=who==='user'?'user-message':'bot-message';p.textContent=text;document.getElementById('chatMessages').appendChild(p);document.getElementById('chatMessages').scrollTop=99999;}
async function askChat(question){if(!question.trim())return;addChatMessage(question,'user');const a=await getAnswer(question);addChatMessage(a,'bot');}
document.getElementById('chatForm')?.addEventListener('submit',e=>{e.preventDefault();const input=document.getElementById('chatInput');const q=input.value.trim();input.value='';askChat(q);});
document.querySelectorAll('.chatbot-quick button').forEach(b=>b.addEventListener('click',()=>askChat(b.dataset.question)));

const allFaqs=[...document.querySelectorAll('.faq details')];
allFaqs.forEach(item=>item.addEventListener('toggle',()=>{if(item.open)allFaqs.forEach(other=>{if(other!==item)other.open=false;});}));
document.getElementById('viewAllQuestions')?.addEventListener('click',()=>{document.getElementById('faqs')?.scrollIntoView({behavior:'smooth'});chatClose();});
