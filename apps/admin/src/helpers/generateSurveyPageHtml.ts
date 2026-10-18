/**
 * Generates a self-contained static HTML survey page saved to S3.
 *
 * S3 key : surveys/{surveyId}.html
 * URL    : {FRONTEND_WEBSITE_URL}/surveys/{surveyId}.html
 */

import type { Survey } from '../components/surveys/SurveysManager';
import env from '../utils/env';

export function generateSurveyPageHtml(survey: Survey): string {
  const backendApi = env.backendApi ?? '';
  const siteName = env.siteName ?? 'OpenPress';
  const siteBaseUrl = env.siteBaseUrl ?? '';

  const esc = (s: string) =>
    String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const title = esc(survey.title || 'Survey');
  const description = esc(survey.description || '');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} - ${esc(siteName)}</title>
  <meta name="description" content="${description}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:site_name" content="${esc(siteName)}" />
  <meta name="robots" content="noindex, nofollow" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: Inter, 'Libre Franklin', 'Segoe UI', Roboto, sans-serif;
      background: #f9fafb;
      min-height: 100vh;
      padding: 1.5rem 1rem 3rem;
      color: #111827;
    }

    .wrap {
      max-width: 640px;
      margin: 0 auto;
    }

    .card {
      background: #fff;
      border: 1px solid #e5e7eb;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
      margin-bottom: 0.9rem;
    }

    .card-bar { height: 8px; background: #111827; }
    .card-body { padding: 1.4rem; }

    .form-title {
      font-size: 1.5rem;
      font-family: 'Merriweather', Georgia, serif;
      font-weight: 700;
      color: #111827;
      line-height: 1.3;
    }

    .form-desc { font-size: 0.9rem; color: #4b5563; margin-top: 0.5rem; }
    .req-note { font-size: 0.75rem; color: #ef4444; margin-top: 0.9rem; }

    .q-text {
      font-size: 0.95rem;
      font-weight: 600;
      color: #111827;
      margin-bottom: 0.8rem;
    }

    .q-desc {
      font-size: 0.8rem;
      color: #6b7280;
      margin-top: -0.4rem;
      margin-bottom: 0.8rem;
    }

    .asterisk { color: #ef4444; margin-left: 3px; }

    .option {
      display: flex;
      align-items: center;
      gap: 0.72rem;
      margin-bottom: 0.58rem;
      cursor: pointer;
      font-size: 0.9rem;
      color: #374151;
      user-select: none;
    }

    .option-btn {
      width: 100%;
      border: none;
      background: transparent;
      padding: 0;
      text-align: left;
    }

    .circle, .square {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      border: 2px solid #9ca3af;
      transition: border-color 0.15s, background 0.15s;
    }

    .circle { border-radius: 50%; }
    .square { border-radius: 2px; }
    .circle.on, .square.on { border-color: #111827; background: #111827; }

    .circle.on::after {
      content: '';
      display: block;
      width: 8px;
      height: 8px;
      background: #fff;
      border-radius: 50%;
      margin: 4px auto;
    }

    .square.on::after {
      content: '\\2713';
      display: block;
      color: #fff;
      font-size: 13px;
      text-align: center;
      line-height: 16px;
    }

    .rating-row { display: flex; gap: 0.6rem; flex-wrap: wrap; }

    .rating-btn {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      border: 2px solid #d1d5db;
      background: #fff;
      font-size: 0.85rem;
      font-weight: 600;
      color: #374151;
      cursor: pointer;
      transition: all 0.15s;
    }

    .rating-btn:hover { border-color: #111827; color: #111827; }
    .rating-btn.on { border-color: #111827; background: #111827; color: #fff; }

    .text-in, .para-in {
      width: 100%;
      border: none;
      border-bottom: 2px solid #e5e7eb;
      padding: 0.25rem 0;
      font-size: 0.9rem;
      color: #111827;
      background: transparent;
      outline: none;
      transition: border-color 0.15s;
      resize: none;
      font-family: inherit;
    }

    .custom-select {
      position: relative;
      width: 50%;
      user-select: none;
    }
    .custom-select-btn {
      width: 100%;
      background-color: #fff;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      padding: 0.6rem 2.5rem 0.6rem 0.75rem;
      font-size: 0.95rem;
      color: #111827;
      text-align: left;
      cursor: pointer;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 0.75rem center;
      background-size: 1rem;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .custom-select.open .custom-select-btn {
      border-color: #111827;
      box-shadow: 0 0 0 1px #111827;
    }
    .custom-select-list {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      margin-top: 4px;
      background-color: #fff;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      z-index: 50;
      max-height: 240px;
      overflow-y: auto;
      display: none;
    }
    .custom-select.open .custom-select-list {
      display: block;
    }
    .custom-select-opt {
      padding: 0.6rem 0.75rem;
      font-size: 0.95rem;
      color: #374151;
      cursor: pointer;
    }
    .custom-select-opt:hover {
      background-color: #f3f4f6;
      color: #111827;
    }
    .custom-select-opt.selected {
      background-color: #e5e7eb;
      font-weight: 500;
      color: #111827;
    }

    .field-err {
      font-size: 0.75rem;
      color: #ef4444;
      margin-top: 0.35rem;
      display: none;
      align-items: center;
      gap: 0.25rem;
    }

    .card.err { border-left: 4px solid #ef4444; }

    .sub-err {
      background: #fef2f2;
      border: 1px solid #fecaca;
      padding: 0.75rem 1rem;
      font-size: 0.875rem;
      color: #dc2626;
      margin-bottom: 0.9rem;
      display: none;
    }

    .actions {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.55rem;
      margin-top: 0.35rem;
    }

    .btn-submit {
      background: #111827;
      color: #fff;
      border: 1px solid #111827;
      padding: 0.58rem 1.45rem;
      font-size: 0.87rem;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.15s;
      min-width: 112px;
    }

    .btn-submit:hover { opacity: 0.9; }
    .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }

    .btn-clear {
      background: #fff;
      border: 1px solid #111827;
      color: #111827;
      padding: 0.58rem 1.1rem;
      font-size: 0.87rem;
      font-weight: 600;
      cursor: pointer;
    }

    .state { text-align: center; padding: 2.4rem 1rem; }
    .state-icon { font-size: 2.7rem; margin-bottom: 0.8rem; }
    .state-title { font-size: 1.2rem; font-weight: 700; color: #111827; margin-bottom: 0.45rem; }
    .state-msg { font-size: 0.9rem; color: #6b7280; }

    .spinner {
      display: inline-block;
      width: 30px;
      height: 30px;
      border: 3px solid #e5e7eb;
      border-top-color: #111827;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .footer {
      text-align: center;
      margin-top: 1.2rem;
      font-size: 0.75rem;
      color: #9ca3af;
    }

    .footer a { color: #111827; text-decoration: none; font-weight: 600; }

    @media (max-width: 640px) {
      body { padding-top: 1rem; }
      .card-body { padding: 1.15rem; }
      .form-title { font-size: 1.35rem; }
    }
  </style>
</head>
<body>
<div class="wrap" id="app">
  <div class="state"><div class="spinner"></div><p style="margin-top:1rem;color:#9CA3AF;font-size:.875rem;">Loading survey...</p></div>
</div>
<script>
(function(){
  var API = ${JSON.stringify(backendApi)};
  var SID = ${JSON.stringify(survey.surveyId)};
  var SITE = ${JSON.stringify(siteBaseUrl)};
  var NAME = ${JSON.stringify(siteName)};
  var ans = {};
  var data = null;

  function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;'); }

  function loadSurvey(){
    fetch(API + '/surveys/public/' + SID, { method:'GET' })
      .then(function(r){
        return r.json().catch(function(){ return {}; }).then(function(j){ return { ok:r.ok, status:r.status, body:j }; });
      })
      .then(function(res){
        if(!res.ok){
          if(res.body && res.body.status === 'paused'){ renderPaused(); return; }
          throw new Error((res.body && res.body.message) || ('Survey not available (' + res.status + ')'));
        }
        data = res.body.survey || res.body; render(data);
      })
      .catch(function(e){ renderErr(e.message); });
  }

  function renderErr(msg){
    document.getElementById('app').innerHTML = '<div class="card"><div class="card-bar"></div><div class="card-body"><div class="state"><div class="state-icon">\\u26a0\\ufe0f</div><div class="state-title">Survey unavailable</div><div class="state-msg">' + esc(msg || 'This survey is not available.') + '</div></div></div></div>';
  }

  function renderPaused(){
    document.getElementById('app').innerHTML = '<div class="card"><div class="card-bar"></div><div class="card-body"><div class="state"><div class="state-icon">\\u26a0\\ufe0f</div><div class="state-title">Oops</div><div class="state-msg">This survey isn&#39;t accepting responses for now.</div></div></div></div>';
  }

  function renderUpcoming(s){
    var startStr = s.startTime ? new Date(s.startTime).toLocaleString('en-NZ', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : 'soon';
    document.getElementById('app').innerHTML = '<div class="card"><div class="card-bar"></div><div class="card-body"><div class="state"><div class="state-icon">⏳</div><div class="state-title">' + esc(s.title) + '</div><div class="state-msg">This survey has not started yet. It is scheduled to begin on <strong>' + esc(startStr) + '</strong>.</div></div></div></div>';
  }

  function renderClosed(s){
    document.getElementById('app').innerHTML = '<div class="card"><div class="card-bar"></div><div class="card-body"><div class="state"><div class="state-icon">\\uD83D\\uDD12</div><div class="state-title">' + esc(s.title) + '</div><div class="state-msg">This survey is currently <strong>' + esc(s.status) + '</strong> and is not accepting responses.</div></div></div></div>';
  }

  function renderDone(){
    document.getElementById('app').innerHTML = '<div class="card"><div class="card-bar"></div><div class="card-body"><div class="state"><div style="font-size:2.2rem;color:#111827;margin-bottom:.8rem;">\\u2713</div><div class="state-title">Response submitted!</div><div class="state-msg">Your response has been recorded. Thank you.</div><p style="margin-top:1rem;font-size:.75rem;color:#9CA3AF;">You may now close this tab.</p></div></div></div>';
  }

  function render(s){
    var isUpcoming = s.startTime && !isNaN(new Date(s.startTime).getTime()) && new Date(s.startTime) > new Date();
    if(isUpcoming){
      renderUpcoming(s);
      return;
    }

    var isExpired = s.endTime && !isNaN(new Date(s.endTime).getTime()) && new Date(s.endTime) < new Date();
    if(s.status !== 'active' || isExpired){
      var closedSurvey = isExpired ? Object.assign({}, s, { status: 'closed' }) : s;
      renderClosed(closedSurvey);
      return;
    }

    var qs = (s.questions || []).slice().sort(function(a,b){ return a.order - b.order; });
    var h = '<div class="card"><div class="card-bar"></div><div class="card-body"><div class="form-title">' + esc(s.title) + '</div>' + (s.description ? '<div class="form-desc">' + esc(s.description) + '</div>' : '') + '<div class="req-note">* Required</div></div></div>';

    if (s.collectEmails) {
      h += '<div class="card" id="c-email"><div class="card-body"><div class="q-text">Email Address <span class="asterisk">*</span></div>';
      h += '<input class="text-in" type="email" placeholder="Your email address" id="f-email" oninput="clrEmailErr()" />';
      h += '<div class="field-err" id="e-email">\\u26a0 Email address is required.</div></div></div>';
    }

    qs.forEach(function(q){
      h += '<div class="card" id="c-' + esc(q.questionId) + '"><div class="card-body"><div class="q-text">' + esc(q.text || 'Question') + (q.required ? '<span class="asterisk">*</span>' : '') + '</div>' + (q.description ? '<div class="q-desc">' + esc(q.description) + '</div>' : '');

      if(q.type === 'single_choice'){
        (q.options || []).forEach(function(o){
          h += '<button type="button" class="option option-btn" data-qid="' + esc(q.questionId) + '" data-oid="' + esc(o.id) + '" onclick="sr(this.dataset.qid,this.dataset.oid)"><div class="circle" id="r-' + esc(q.questionId) + '-' + esc(o.id) + '"></div><span>' + esc(o.label) + '</span></button>';
        });
      } else if(q.type === 'dropdown'){
        h += '<div class="custom-select" id="cs-' + esc(q.questionId) + '">';
        h += '<button type="button" class="custom-select-btn" data-qid="' + esc(q.questionId) + '" onclick="tcs(this)"><span id="cs-val-' + esc(q.questionId) + '">Choose</span></button>';
        h += '<div class="custom-select-list">';
        (q.options || []).forEach(function(o){
          h += '<div class="custom-select-opt" id="cso-' + esc(q.questionId) + '-' + esc(o.id) + '" data-qid="' + esc(q.questionId) + '" data-oid="' + esc(o.id) + '" data-label="' + esc(o.label) + '" onclick="scs(this)">' + esc(o.label) + '</div>';
        });
        h += '</div></div>';
      } else if(q.type === 'multiple_choice'){
        (q.options || []).forEach(function(o){
          h += '<button type="button" class="option option-btn" data-qid="' + esc(q.questionId) + '" data-oid="' + esc(o.id) + '" onclick="tc(this.dataset.qid,this.dataset.oid)"><div class="square" id="k-' + esc(q.questionId) + '-' + esc(o.id) + '"></div><span>' + esc(o.label) + '</span></button>';
        });
      } else if(q.type === 'rating_scale'){
        h += '<div class="rating-row">';
        [1,2,3,4,5].forEach(function(n){
          h += '<button type="button" class="rating-btn" id="rt-' + esc(q.questionId) + '-' + n + '" data-qid="' + esc(q.questionId) + '" data-n="' + n + '" onclick="rr(this.dataset.qid,+this.dataset.n)">' + n + '</button>';
        });
        h += '</div>';
      } else if(q.type === 'multiple_choice_grid'){
        h += '<div style="overflow-x: auto; margin-top: 1rem;"><table style="width: 100%; border-collapse: collapse; text-align: center; min-width: 400px;">';
        h += '<thead><tr><th style="padding: 0.5rem; text-align: left; border-bottom: 1px solid #e5e7eb;"></th>';
        (q.options || []).forEach(function(o){
          h += '<th style="padding: 0.5rem; font-weight: 500; font-size: 0.85rem; color: #4b5563; border-bottom: 1px solid #e5e7eb;">' + esc(o.label) + '</th>';
        });
        h += '</tr></thead><tbody>';
        (q.rows || []).forEach(function(r, ri){
          h += '<tr style="' + (ri % 2 === 0 ? 'background: #f9fafb;' : 'background: #fff;') + '"><td style="padding: 0.8rem 0.5rem; text-align: left; font-size: 0.9rem; border-bottom: 1px solid #e5e7eb; min-width: 120px;">' + esc(r.label) + '</td>';
          (q.options || []).forEach(function(o){
             var flatQid = q.questionId + '_' + r.id;
             h += '<td style="padding: 0.8rem 0.5rem; border-bottom: 1px solid #e5e7eb;"><button type="button" class="option-btn" data-qid="' + esc(flatQid) + '" data-oid="' + esc(o.id) + '" onclick="mcg(this.dataset.qid, this.dataset.oid, \\'' + esc(q.questionId) + '\\')" style="display:inline-block; width:100%; text-align:center;"><div class="circle" id="r-' + esc(flatQid) + '-' + esc(o.id) + '" style="margin: 0 auto;"></div></button></td>';
          });
          h += '</tr>';
        });
        h += '</tbody></table></div>';
      } else if(q.type === 'checkbox_grid'){
        h += '<div style="overflow-x: auto; margin-top: 1rem;"><table style="width: 100%; border-collapse: collapse; text-align: center; min-width: 400px;">';
        h += '<thead><tr><th style="padding: 0.5rem; text-align: left; border-bottom: 1px solid #e5e7eb;"></th>';
        (q.options || []).forEach(function(o){
          h += '<th style="padding: 0.5rem; font-weight: 500; font-size: 0.85rem; color: #4b5563; border-bottom: 1px solid #e5e7eb;">' + esc(o.label) + '</th>';
        });
        h += '</tr></thead><tbody>';
        (q.rows || []).forEach(function(r, ri){
          h += '<tr style="' + (ri % 2 === 0 ? 'background: #f9fafb;' : 'background: #fff;') + '"><td style="padding: 0.8rem 0.5rem; text-align: left; font-size: 0.9rem; border-bottom: 1px solid #e5e7eb; min-width: 120px;">' + esc(r.label) + '</td>';
          (q.options || []).forEach(function(o){
             var flatQid = q.questionId + '_' + r.id;
             h += '<td style="padding: 0.8rem 0.5rem; border-bottom: 1px solid #e5e7eb;"><button type="button" class="option-btn" data-flatqid="' + esc(flatQid) + '" data-oid="' + esc(o.id) + '" data-pqid="' + esc(q.questionId) + '" onclick="cbg(this.dataset.flatqid, this.dataset.oid, this.dataset.pqid)" style="display:inline-block; width:100%; text-align:center;"><div class="square" id="k-' + esc(flatQid) + '-' + esc(o.id) + '" style="margin: 0 auto;"></div></button></td>';
          });
          h += '</tr>';
        });
        h += '</tbody></table></div>';
      } else if(q.type === 'short_text'){
        h += '<input class="text-in" type="text" placeholder="Your answer" data-qid="' + esc(q.questionId) + '" oninput="sa(this.dataset.qid,this.value)" />';
      } else if(q.type === 'paragraph'){
        h += '<textarea class="para-in" rows="4" placeholder="Your answer" data-qid="' + esc(q.questionId) + '" oninput="sa(this.dataset.qid,this.value)"></textarea>';
      }

      h += '<div class="field-err" id="e-' + esc(q.questionId) + '">\\u26a0 This is a required question.</div></div></div>';
    });

    h += '<div class="sub-err" id="sub-err"></div><div class="actions"><button class="btn-submit" id="btn-sub" onclick="submit()">Submit</button><button class="btn-clear" onclick="clearForm()">Clear form</button></div>';
    h += '<div class="footer">Powered by <a href="' + esc(SITE) + '">' + esc(NAME) + '</a>. Never submit passwords through surveys.</div>';

    document.getElementById('app').innerHTML = h;
  }

  window.sr = function(qId,oId){
    ans[qId] = oId;
    clrErr(qId);
    var opts = ((data.questions || []).find(function(q){ return q.questionId === qId; }) || {}).options || [];
    opts.forEach(function(o){
      var el = document.getElementById('r-' + qId + '-' + o.id);
      if(el) el.className = 'circle' + (o.id === oId ? ' on' : '');
    });
  };

  window.mcg = function(flatQid, oId, parentQid){
    ans[flatQid] = oId;
    clrErr(parentQid); // clear error on the parent question card
    // We need to find the specific row's options. They are the same as the parent question's options.
    var opts = ((data.questions || []).find(function(q){ return q.questionId === parentQid; }) || {}).options || [];
    opts.forEach(function(o){
      var el = document.getElementById('r-' + flatQid + '-' + o.id);
      if(el) el.className = 'circle' + (o.id === oId ? ' on' : '');
    });
  };

  window.cbg = function(flatQid, oId, parentQid){
    var a = Array.isArray(ans[flatQid]) ? ans[flatQid] : [];
    var i = a.indexOf(oId);
    if(i === -1) a.push(oId); else a.splice(i,1);
    ans[flatQid] = a;
    clrErr(parentQid);
    var el = document.getElementById('k-' + flatQid + '-' + oId);
    if(el) el.className = 'square' + (i === -1 ? ' on' : '');
  };

  window.tc = function(qId,oId){
    var a = Array.isArray(ans[qId]) ? ans[qId] : [];
    var i = a.indexOf(oId);
    if(i === -1) a.push(oId); else a.splice(i,1);
    ans[qId] = a;
    clrErr(qId);
    var el = document.getElementById('k-' + qId + '-' + oId);
    if(el) el.className = 'square' + (i === -1 ? ' on' : '');
  };

  window.rr = function(qId,n){
    ans[qId] = n;
    clrErr(qId);
    [1,2,3,4,5].forEach(function(i){
      var el = document.getElementById('rt-' + qId + '-' + i);
      if(el) el.className = 'rating-btn' + (i === n ? ' on' : '');
    });
  };

  window.sa = function(qId,v){ ans[qId] = v; clrErr(qId); };

  window.tcs = function(btn){
    var qId = btn.dataset.qid;
    document.querySelectorAll('.custom-select.open').forEach(function(el){
      if(el.id !== 'cs-' + qId) el.classList.remove('open');
    });
    var el = document.getElementById('cs-' + qId);
    if(el) el.classList.toggle('open');
  };

  window.scs = function(optEl){
    var qId = optEl.dataset.qid;
    var oId = optEl.dataset.oid;
    var label = optEl.dataset.label;
    ans[qId] = oId;
    clrErr(qId);
    var el = document.getElementById('cs-' + qId);
    if(el) el.classList.remove('open');
    var valEl = document.getElementById('cs-val-' + qId);
    if(valEl) valEl.textContent = label;
    var opts = ((data.questions || []).find(function(q){ return q.questionId === qId; }) || {}).options || [];
    opts.forEach(function(o){
      var optElem = document.getElementById('cso-' + qId + '-' + o.id);
      if(optElem) optElem.className = 'custom-select-opt' + (o.id === oId ? ' selected' : '');
    });
  };

  document.addEventListener('click', function(e){
    if(!e.target.closest('.custom-select')){
      document.querySelectorAll('.custom-select.open').forEach(function(el){
        el.classList.remove('open');
      });
    }
  });

  window.clrEmailErr = function() {
    var e = document.getElementById('e-email');
    if(e) e.style.display = 'none';
    var c = document.getElementById('c-email');
    if(c) c.classList.remove('err');
  };

  window.clearForm = function(){
    ans = {};
    document.querySelectorAll('.circle.on').forEach(function(el){ el.className = 'circle'; });
    document.querySelectorAll('.square.on').forEach(function(el){ el.className = 'square'; });
    document.querySelectorAll('.rating-btn.on').forEach(function(el){ el.className = 'rating-btn'; });
    document.querySelectorAll('.text-in').forEach(function(el){ el.value = ''; });
    document.querySelectorAll('.para-in').forEach(function(el){ el.value = ''; });
    document.querySelectorAll('.custom-select-opt.selected').forEach(function(el){ el.className = 'custom-select-opt'; });
    document.querySelectorAll('[id^="cs-val-"]').forEach(function(el){ el.textContent = 'Choose'; });
    document.querySelectorAll('.field-err').forEach(function(el){ el.style.display = 'none'; });
    document.querySelectorAll('.card.err').forEach(function(el){ el.classList.remove('err'); });

    var se = document.getElementById('sub-err');
    if(se){ se.style.display = 'none'; se.textContent = ''; }

    var btn = document.getElementById('btn-sub');
    if(btn){ btn.disabled = false; btn.textContent = 'Submit'; }
  };

  function validateAnswer(val, validation){
    if(!validation || val === undefined || val === null) return null;

    var type = validation.type;
    var subType = validation.subType;
    var min = validation.min;
    var max = validation.max;
    var regex = validation.regex;
    var errMsg = validation.errorMessage;

    if (type === 'selection_count' || type === 'selection') {
      var count = 0;
      if (Array.isArray(val)) {
        count = val.filter(function(x){ return x !== undefined && x !== null && String(x).trim().length > 0; }).length;
      } else if (String(val).trim().length > 0) {
        count = 1;
      }

      if (subType === 'min_select' || subType === 'at_least') {
        if (min !== undefined && count < min) return errMsg || ('Please select at least ' + min + ' option' + (min === 1 ? '.' : 's.'));
      } else if (subType === 'max_select' || subType === 'at_most') {
        if (max !== undefined && count > max) return errMsg || ('Please select at most ' + max + ' option' + (max === 1 ? '.' : 's.'));
      } else if (subType === 'exact_select' || subType === 'exact') {
        var target = min !== undefined ? min : max;
        if (target !== undefined && count !== target) return errMsg || ('Please select exactly ' + target + ' option' + (target === 1 ? '.' : 's.'));
      } else if (subType === 'between') {
        if (min !== undefined && count < min) return errMsg || ('Please select between ' + min + ' and ' + (max !== undefined ? max : '') + ' options.');
        if (max !== undefined && count > max) return errMsg || ('Please select between ' + (min !== undefined ? min : '') + ' and ' + max + ' options.');
      } else {
        if (min !== undefined && count < min) return errMsg || ('Please select at least ' + min + ' option' + (min === 1 ? '.' : 's.'));
        if (max !== undefined && count > max) return errMsg || ('Please select at most ' + max + ' option' + (max === 1 ? '.' : 's.'));
      }
      return null;
    }

    var valStr = String(val).trim();
    if(valStr.length === 0) return null;

    if(type === 'email'){
      var emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
      if(!emailRegex.test(valStr)) return errMsg || 'Please enter a valid email address.';
    } else if(type === 'phone'){
      var phoneRegex = /^\\+?[\\d\\s\\-()]{7,20}$/;
      if(!phoneRegex.test(valStr)) return errMsg || 'Please enter a valid phone number.';
    } else if(type === 'number'){
      var num = Number(valStr);
      if(isNaN(num) || !isFinite(num)) return errMsg || 'Must be a valid number.';
      if(subType === 'greater_than' && min !== undefined && num < min) return errMsg || ('Must be greater than or equal to ' + min + '.');
      if(subType === 'less_than' && max !== undefined && num > max) return errMsg || ('Must be less than or equal to ' + max + '.');
      if(subType === 'between'){
        if(min !== undefined && num < min) return errMsg || ('Must be between ' + min + ' and ' + (max !== undefined ? max : '') + '.');
        if(max !== undefined && num > max) return errMsg || ('Must be between ' + (min !== undefined ? min : '') + ' and ' + max + '.');
      }
    } else if(type === 'length'){
      if(subType === 'min_length' && min !== undefined && valStr.length < min) return errMsg || ('Minimum character count is ' + min + '.');
      if(subType === 'max_length' && max !== undefined && valStr.length > max) return errMsg || ('Maximum character count is ' + max + '.');
    } else if(type === 'regex' && regex){
      try {
        if(subType === 'contains'){
          if(valStr.indexOf(regex) === -1) return errMsg || ('Must contain "' + regex + '".');
        } else if(subType === 'not_contains'){
          if(valStr.indexOf(regex) !== -1) return errMsg || ('Must not contain "' + regex + '".');
        } else {
          var re = new RegExp(regex);
          if(!re.test(valStr)) return errMsg || 'Must match the required format.';
        }
      } catch(e){}
    }
    return null;
  }

  function isBlankAnswer(a){
    if(a === undefined || a === null) return true;
    if(typeof a === 'string') return !a.trim();
    if(Array.isArray(a)) return !a.some(function(item){ return String(item == null ? '' : item).trim(); });
    return false;
  }

  function clrErr(qId){
    var e = document.getElementById('e-' + qId);
    if(e) e.style.display = 'none';
    var c = document.getElementById('c-' + qId);
    if(c) c.classList.remove('err');
  }

  window.submit = function(){
    if(!data) return;

    var ok = true;
    var respondentEmail = '';

    if (data.collectEmails) {
      var emailInput = document.getElementById('f-email');
      var emailVal = emailInput ? emailInput.value.trim() : '';
      var EMAIL_RE = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
      
      if (!emailVal) {
        ok = false;
        var e = document.getElementById('e-email');
        if(e) {
          e.textContent = '\\u26a0 Email address is required.';
          e.style.display = 'flex';
        }
        var c = document.getElementById('c-email');
        if(c) c.classList.add('err');
      } else if (!EMAIL_RE.test(emailVal)) {
        ok = false;
        var e = document.getElementById('e-email');
        if(e) {
          e.textContent = '\\u26a0 Please enter a valid email address.';
          e.style.display = 'flex';
        }
        var c = document.getElementById('c-email');
        if(c) c.classList.add('err');
      } else {
        respondentEmail = emailVal.toLowerCase();
      }
    }

    (data.questions || []).forEach(function(q){
      if(q.type === 'multiple_choice_grid' || q.type === 'checkbox_grid'){
        if(q.required){
          var missingRow = false;
          (q.rows || []).forEach(function(r){
            var a = ans[q.questionId + '_' + r.id];
            if(isBlankAnswer(a)) missingRow = true;
          });
          if(missingRow){
            ok = false;
            var e = document.getElementById('e-' + q.questionId);
            if(e) {
              e.textContent = q.type === 'checkbox_grid'
                ? '\\u26a0 Please select at least one option for each row.'
                : '\\u26a0 Please select an option for each row.';
              e.style.display = 'flex';
            }
            var c = document.getElementById('c-' + q.questionId);
            if(c) c.classList.add('err');
          }
        }
      } else {
        var a = ans[q.questionId];
        var empty = isBlankAnswer(a);
        if(q.required && empty){
          ok = false;
          var e = document.getElementById('e-' + q.questionId);
          if(e) { e.style.display = 'flex'; e.innerHTML = '\\u26a0 This is a required question.'; }
          var c = document.getElementById('c-' + q.questionId);
          if(c) c.classList.add('err');
        } else if(!empty && q.validation){
          var valErr = validateAnswer(a, q.validation);
          if(valErr){
            ok = false;
            var e = document.getElementById('e-' + q.questionId);
            if(e) { e.style.display = 'flex'; e.textContent = '\\u26a0 ' + valErr; }
            var c = document.getElementById('c-' + q.questionId);
            if(c) c.classList.add('err');
          }
        }
      }
    });

    if(!ok) return;

    var btn = document.getElementById('btn-sub');
    if(btn){ btn.disabled = true; btn.textContent = 'Submitting...'; }

    var se = document.getElementById('sub-err');
    if(se) se.style.display = 'none';

    var qLabels = {};
    var oLabels = {};
    var rLabels = {};
    (data.questions || []).forEach(function(q){
      if(q.questionId && q.text) qLabels[q.questionId] = q.text;
      (q.options || []).forEach(function(o){ if(o.id && o.label) oLabels[o.id] = o.label; });
      (q.historicalOptions || []).forEach(function(o){ if(o.id && o.label) oLabels[o.id] = o.label; });
      (q.rows || []).forEach(function(r){ if(r.id && r.label) rLabels[r.id] = r.label; });
      (q.historicalRows || []).forEach(function(r){ if(r.id && r.label) rLabels[r.id] = r.label; });
    });

    var payload = {
      answers: ans,
      questionLabels: qLabels,
      optionLabels: oLabels,
      rowLabels: rLabels
    };
    if (data.collectEmails) {
      payload.respondentId = respondentEmail;
    }

    fetch(API + '/surveys/' + SID + '/responses', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function(r){
        if(!r.ok){
          return r.json().then(function(j){ throw new Error(j.message || 'Submission failed'); });
        }
        renderDone();
      })
      .catch(function(e){
        if(btn){ btn.disabled = false; btn.textContent = 'Submit'; }
        if(se){ se.textContent = e.message || 'Submission failed. Please try again.'; se.style.display = 'block'; }
      });
  };

  loadSurvey();
})();
</script>
</body>
</html>`;
}
