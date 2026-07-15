const ANNOTATION_CSS = "\n#hl-add-btn{position:fixed;left:0;top:50%;transform:translateY(-50%);z-index:9999;background:#2563eb;color:#fff;border:none;border-radius:0 12px 12px 0;padding:14px 8px;font-size:13px;line-height:1.6;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.25);text-align:center;}\n#hl-add-btn.armed{background:#dc2626;}\nbody.hl-selecting, body.hl-selecting *{cursor:crosshair !important;}\n#hl-panel-tab{position:fixed;right:0;top:120px;z-index:9998;background:#111827;color:#fff;border:none;border-radius:12px 0 0 12px;padding:10px 8px;font-size:13px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.25);}\n#hl-panel{position:fixed;right:0;top:0;height:100vh;width:320px;max-width:85vw;background:#fff;box-shadow:-2px 0 12px rgba(0,0,0,.2);z-index:9998;transform:translateX(100%);transition:transform .2s ease;display:flex;flex-direction:column;}\n#hl-panel.open{transform:translateX(0);}\n.hl-panel-header{padding:16px;font-weight:bold;border-bottom:1px solid #e5e7eb;background:#f9fafb;display:flex;justify-content:space-between;align-items:center;}\n.hl-panel-close{background:none;border:none;font-size:16px;cursor:pointer;color:#6b7280;}\n.hl-panel-body{flex:1;overflow-y:auto;padding:8px;}\n.hl-panel-item{border:1px solid #e5e7eb;border-radius:8px;padding:10px;margin-bottom:8px;background:#fff;}\n.hl-panel-item:hover{background:#f3f4f6;}\n.hl-item-quote{font-size:12px;background:#fff59d;padding:2px 4px;border-radius:4px;margin-bottom:6px;display:inline-block;cursor:pointer;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}\n.hl-item-name{font-weight:bold;font-size:13px;}\n.hl-item-time{color:#9ca3af;font-size:11px;margin-left:6px;font-weight:normal;}\n.hl-item-memo{font-size:13px;color:#374151;margin-top:4px;white-space:pre-wrap;cursor:pointer;}\n.hl-item-actions{display:flex;gap:6px;margin-top:6px;}\n.hl-item-actions button{border:none;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:11px;}\n.hl-panel-empty{color:#9ca3af;font-size:13px;padding:16px;text-align:center;}\nmark.hl-highlight{background:#fff59d;padding:1px 0;cursor:pointer;}\nspan.hl-underline{border-bottom:3px solid #ef4444;cursor:pointer;}\n.hl-flash{animation:hlFlash 1.4s ease;}\n@keyframes hlFlash{0%{box-shadow:0 0 0 4px #2563eb;}100%{box-shadow:0 0 0 0 transparent;}}\n.hl-hint{position:fixed;left:70px;top:50%;transform:translateY(-50%);z-index:9999;background:#111827;color:#fff;padding:8px 12px;border-radius:8px;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,.25);}\n.hl-card{position:fixed;z-index:10000;background:#fff;border:1px solid #d1d5db;border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,.2);padding:12px;width:260px;font-size:13px;}\n.hl-card label{display:block;margin-top:8px;margin-bottom:2px;font-weight:bold;color:#374151;}\n.hl-card input, .hl-card textarea{width:100%;box-sizing:border-box;border:1px solid #d1d5db;border-radius:6px;padding:6px;font-size:13px;font-family:inherit;}\n.hl-card textarea{min-height:60px;resize:vertical;}\n.hl-type-toggle{display:flex;gap:6px;}\n.hl-type-toggle button{flex:1;border:1px solid #d1d5db;background:#f9fafb;border-radius:6px;padding:6px;cursor:pointer;font-size:12px;}\n.hl-type-toggle button.active{background:#2563eb;color:#fff;border-color:#2563eb;}\n.hl-card-actions{display:flex;justify-content:flex-end;gap:6px;margin-top:10px;}\n.hl-card-actions button{border:none;border-radius:6px;padding:6px 12px;cursor:pointer;font-size:12px;}\n.hl-cancel{background:#e5e7eb;color:#111827;}\n.hl-save{background:#2563eb;color:#fff;}\n.hl-delete{background:#dc2626;color:#fff;}\n.hl-edit{background:#f59e0b;color:#fff;}\n.hl-popup-name{font-weight:bold;}\n.hl-popup-time{color:#9ca3af;font-size:11px;margin-bottom:6px;}\n.hl-popup-memo{white-space:pre-wrap;margin-bottom:8px;}\n";

(function(){
  const container = document.getElementById('annotatable');
  if(!container) return;

  const PAGE = location.pathname;
  const pristineHTML = container.innerHTML;

  function escapeHtml(s){
    return String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function fmtTime(ts){
    if(!ts || !ts.toDate) return '';
    const d = ts.toDate();
    return d.getFullYear()+'/'+(d.getMonth()+1)+'/'+d.getDate()+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
  }

  const styleTag = document.createElement('style');
  styleTag.id = 'hl-style';
  styleTag.textContent = ANNOTATION_CSS;
  document.head.appendChild(styleTag);

  Promise.all([
    import('https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js')
  ]).then(([appMod, fsMod])=>{
    const { initializeApp } = appMod;
    const { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, orderBy, serverTimestamp } = fsMod;

    const firebaseConfig = {
      apiKey: "AIzaSyClRvwl06F8sPrw6kUwZ1SlWy0M3FzBO7c",
      authDomain: "okazaki-kato-seminar00.firebaseapp.com",
      projectId: "okazaki-kato-seminar00",
      storageBucket: "okazaki-kato-seminar00.firebasestorage.app",
      messagingSenderId: "264771224160",
      appId: "1:264771224160:web:f89b3a4004330ea7fef905"
    };
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    let annotations = [];
    let armed = false;
    let pendingRange = null;
    let pendingType = 'highlight';
    let hintEl = null;

    // ---------- left button ----------
    const addBtn = document.createElement('button');
    addBtn.id = 'hl-add-btn';
    addBtn.type = 'button';
    addBtn.textContent = '📝 メモを追加';
    document.body.appendChild(addBtn);

    // ---------- right panel ----------
    const panelTab = document.createElement('button');
    panelTab.id = 'hl-panel-tab';
    panelTab.type = 'button';
    panelTab.textContent = '📋 メモ一覧';
    document.body.appendChild(panelTab);

    const panel = document.createElement('div');
    panel.id = 'hl-panel';
    panel.innerHTML = '<div class="hl-panel-header"><span>📋 メモ一覧 (<span id="hl-panel-count">0</span>)</span><button type="button" class="hl-panel-close">✕</button></div><div class="hl-panel-body" id="hl-panel-list"></div>';
    document.body.appendChild(panel);

    let panelOpen = false;
    function setPanelOpen(v){
      panelOpen = v;
      panel.classList.toggle('open', v);
    }
    panelTab.addEventListener('click', ()=> setPanelOpen(!panelOpen));
    panel.querySelector('.hl-panel-close').addEventListener('click', ()=> setPanelOpen(false));

    // ---------- armed / selection mode ----------
    function setArmed(v){
      armed = v;
      addBtn.classList.toggle('armed', v);
      addBtn.textContent = v ? '✕ キャンセル' : '📝 メモを追加';
      document.body.classList.toggle('hl-selecting', v);
      if(v){
        hintEl = document.createElement('div');
        hintEl.className = 'hl-hint';
        hintEl.textContent = 'メモを付けたい範囲をドラッグして選択してください';
        document.body.appendChild(hintEl);
      } else if(hintEl){
        hintEl.remove();
        hintEl = null;
      }
    }
    addBtn.addEventListener('click', ()=>{
      if(armed){ setArmed(false); return; }
      closeFloaters();
      setArmed(true);
    });
    document.addEventListener('keydown', (e)=>{
      if(e.key === 'Escape'){
        if(armed) setArmed(false);
        closeFloaters();
      }
    });

    document.addEventListener('mouseup', (e)=>{
      if(!armed) return;
      const sel = window.getSelection();
      if(!sel || sel.isCollapsed || sel.rangeCount===0) return;
      const range = sel.getRangeAt(0);
      if(!container.contains(range.commonAncestorContainer)) return;
      const text = sel.toString();
      if(!text.trim()) return;
      pendingRange = range.cloneRange();
      const rect = range.getBoundingClientRect();
      setArmed(false);
      showForm(rect);
      sel.removeAllRanges();
    });

    // ---------- floating card / popup helpers ----------
    function closeFloaters(){
      document.querySelectorAll('.hl-card').forEach(el=>el.remove());
    }
    document.addEventListener('mousedown', (e)=>{
      const t = e.target;
      if(t.closest('.hl-card') || t.closest('#hl-add-btn') || t.closest('[data-id]')) return;
      closeFloaters();
    });

    function positionCard(card, rect){
      const margin = 8;
      let left = Math.min(Math.max(rect.left, margin), window.innerWidth - 280 - margin);
      let top = rect.bottom + margin;
      if(top + 260 > window.innerHeight) top = Math.max(rect.top - 260 - margin, margin);
      card.style.left = left + 'px';
      card.style.top = top + 'px';
    }

    function showForm(rect){
      closeFloaters();
      pendingType = 'highlight';
      const card = document.createElement('div');
      card.className = 'hl-card';
      card.innerHTML = '<div class="hl-type-toggle">'
        + '<button type="button" data-type="highlight" class="active">🖍 マーカー</button>'
        + '<button type="button" data-type="underline">_ アンダーライン</button>'
        + '</div>'
        + '<label>名前</label>'
        + '<input type="text" class="hl-name" maxlength="50" placeholder="お名前">'
        + '<label>メモ</label>'
        + '<textarea class="hl-memo" maxlength="1000" placeholder="メモを入力"></textarea>'
        + '<div class="hl-card-actions"><button type="button" class="hl-cancel">キャンセル</button><button type="button" class="hl-save">保存</button></div>';
      document.body.appendChild(card);
      positionCard(card, rect);
      const nameInput = card.querySelector('.hl-name');
      nameInput.value = localStorage.getItem('seo-annotation-name') || '';
      card.querySelectorAll('.hl-type-toggle button').forEach(btn=>{
        btn.addEventListener('click', ()=>{
          card.querySelectorAll('.hl-type-toggle button').forEach(b=>b.classList.remove('active'));
          btn.classList.add('active');
          pendingType = btn.dataset.type;
        });
      });
      card.querySelector('.hl-cancel').addEventListener('click', ()=>{
        pendingRange = null;
        closeFloaters();
      });
      card.querySelector('.hl-save').addEventListener('click', async ()=>{
        const name = nameInput.value.trim();
        const memo = card.querySelector('.hl-memo').value.trim();
        if(!name || !memo){ alert('お名前とメモを入力してください'); return; }
        if(!pendingRange){ closeFloaters(); return; }
        localStorage.setItem('seo-annotation-name', name);
        const start = getGlobalOffset(container, pendingRange.startContainer, pendingRange.startOffset);
        const end = getGlobalOffset(container, pendingRange.endContainer, pendingRange.endOffset);
        const text = pendingRange.toString();
        pendingRange = null;
        closeFloaters();
        if(end <= start || !text.trim()) return;
        try{
          await addDoc(collection(db, 'seo_annotations'), {
            page: PAGE, start, end, text, type: pendingType, name, memo, createdAt: serverTimestamp()
          });
        }catch(err){
          alert('保存に失敗しました: ' + err.message);
        }
      });
    }

    function showPopup(id, anchorRect){
      closeFloaters();
      const a = annotations.find(x=>x.id===id);
      if(!a) return;
      const card = document.createElement('div');
      card.className = 'hl-card';
      renderPopupView(card, a);
      document.body.appendChild(card);
      positionCard(card, anchorRect);
    }

    function renderPopupView(card, a){
      card.innerHTML = '<div class="hl-popup-name">' + escapeHtml(a.name) + '<span class="hl-popup-time">' + fmtTime(a.createdAt) + (a.updatedAt ? '（編集済み）' : '') + '</span></div>'
        + '<div class="hl-popup-memo">' + escapeHtml(a.memo) + '</div>'
        + '<div class="hl-card-actions"><button type="button" class="hl-delete">削除</button><button type="button" class="hl-edit">編集</button></div>';
      card.querySelector('.hl-delete').addEventListener('click', async ()=>{
        if(!confirm('このメモを削除しますか？')) return;
        try{ await deleteDoc(doc(db, 'seo_annotations', a.id)); closeFloaters(); }
        catch(err){ alert('削除に失敗しました: ' + err.message); }
      });
      card.querySelector('.hl-edit').addEventListener('click', ()=> renderPopupEdit(card, a));
    }

    function renderPopupEdit(card, a){
      card.innerHTML = '<label>名前</label><input type="text" class="hl-name" maxlength="50">'
        + '<label>メモ</label><textarea class="hl-memo" maxlength="1000"></textarea>'
        + '<div class="hl-card-actions"><button type="button" class="hl-cancel">キャンセル</button><button type="button" class="hl-save">保存</button></div>';
      card.querySelector('.hl-name').value = a.name;
      card.querySelector('.hl-memo').value = a.memo;
      card.querySelector('.hl-cancel').addEventListener('click', ()=> renderPopupView(card, a));
      card.querySelector('.hl-save').addEventListener('click', async ()=>{
        const name = card.querySelector('.hl-name').value.trim();
        const memo = card.querySelector('.hl-memo').value.trim();
        if(!name || !memo){ alert('お名前とメモを入力してください'); return; }
        try{
          await updateDoc(doc(db, 'seo_annotations', a.id), { name, memo, updatedAt: serverTimestamp() });
          closeFloaters();
        }catch(err){ alert('更新に失敗しました: ' + err.message); }
      });
    }

    // ---------- offset helpers ----------
    function getGlobalOffset(root, node, offset){
      let total = 0;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
      let cur;
      while((cur = walker.nextNode())){
        if(cur === node){ return total + offset; }
        total += cur.nodeValue.length;
      }
      return total;
    }

    function wrapRangeByOffsets(root, start, end, type, id){
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
      let pos = 0;
      const textNodes = [];
      let cur;
      while((cur = walker.nextNode())) textNodes.push(cur);
      for(const node of textNodes){
        const len = node.nodeValue.length;
        const nodeStart = pos;
        const nodeEnd = pos + len;
        pos = nodeEnd;
        if(nodeEnd <= start || nodeStart >= end) continue;
        const from = Math.max(0, start - nodeStart);
        const to = Math.min(len, end - nodeStart);
        if(from >= to) continue;
        const range = document.createRange();
        range.setStart(node, from);
        range.setEnd(node, to);
        const wrapper = document.createElement(type === 'underline' ? 'span' : 'mark');
        wrapper.className = type === 'underline' ? 'hl-underline' : 'hl-highlight';
        wrapper.dataset.id = id;
        try{ range.surroundContents(wrapper); }catch(e){}
      }
    }

    function renderAnnotations(){
      container.innerHTML = pristineHTML;
      const sorted = [...annotations].sort((a,b)=> a.start - b.start);
      for(const a of sorted){
        wrapRangeByOffsets(container, a.start, a.end, a.type, a.id);
      }
    }

    function renderPanel(){
      const list = document.getElementById('hl-panel-list');
      const countEl = document.getElementById('hl-panel-count');
      countEl.textContent = annotations.length;
      if(annotations.length === 0){
        list.innerHTML = '<div class="hl-panel-empty">まだメモはありません</div>';
        return;
      }
      const sorted = [...annotations].sort((a,b)=> a.start - b.start);
      list.innerHTML = sorted.map(a=>{
        const quote = a.text.length > 30 ? a.text.slice(0,30) + '…' : a.text;
        return '<div class="hl-panel-item" data-id="' + a.id + '">'
          + '<div class="hl-item-quote" data-jump="' + a.id + '">' + escapeHtml(quote) + '</div>'
          + '<div><span class="hl-item-name">' + escapeHtml(a.name) + '</span><span class="hl-item-time">' + fmtTime(a.createdAt) + '</span></div>'
          + '<div class="hl-item-memo" data-jump="' + a.id + '">' + escapeHtml(a.memo) + '</div>'
          + '</div>';
      }).join('');
      list.querySelectorAll('[data-jump]').forEach(el=>{
        el.addEventListener('click', ()=> jumpTo(el.dataset.jump));
      });
    }

    function jumpTo(id){
      const el = container.querySelector('[data-id="' + id + '"]');
      if(!el) return;
      el.scrollIntoView({behavior:'smooth', block:'center'});
      el.classList.add('hl-flash');
      setTimeout(()=> el.classList.remove('hl-flash'), 1400);
      const rect = el.getBoundingClientRect();
      showPopup(id, rect);
    }

    container.addEventListener('click', (e)=>{
      const target = e.target.closest('[data-id]');
      if(!target) return;
      e.preventDefault();
      e.stopPropagation();
      showPopup(target.dataset.id, target.getBoundingClientRect());
    });

    const q = query(collection(db, 'seo_annotations'), where('page', '==', PAGE), orderBy('createdAt', 'asc'));
    onSnapshot(q, (snap)=>{
      annotations = snap.docs.map(d=>({ id: d.id, ...d.data() }));
      renderAnnotations();
      renderPanel();
    }, (err)=>{
      console.error('annotation snapshot error', err);
    });
  }).catch(err=>{
    console.error('firebase load error', err);
  });
})();
