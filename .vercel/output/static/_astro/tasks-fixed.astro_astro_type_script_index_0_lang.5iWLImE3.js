console.log("Tasks page loaded successfully");document.getElementById("new-task-btn")?.addEventListener("click",()=>{document.getElementById("new-task-modal")?.classList.remove("hidden"),document.getElementById("new-task-modal")?.classList.add("flex")});document.getElementById("close-task-modal")?.addEventListener("click",()=>{document.getElementById("new-task-modal")?.classList.add("hidden"),document.getElementById("new-task-modal")?.classList.remove("flex")});document.getElementById("ai-assistant-btn")?.addEventListener("click",()=>{document.getElementById("ai-assistant-modal")?.classList.remove("hidden"),document.getElementById("ai-assistant-modal")?.classList.add("flex"),c("productivity_analysis")});document.getElementById("close-ai-assistant")?.addEventListener("click",()=>{document.getElementById("ai-assistant-modal")?.classList.add("hidden"),document.getElementById("ai-assistant-modal")?.classList.remove("flex")});document.getElementById("toggle-advanced")?.addEventListener("click",()=>{const s=document.getElementById("advanced-options"),t=document.getElementById("toggle-advanced");s?.classList.contains("hidden")?(s.classList.remove("hidden"),t.textContent="▲ Advanced Options (Optional)"):(s?.classList.add("hidden"),t.textContent="▼ Advanced Options (Optional)")});document.addEventListener("click",async s=>{const t=s.target;if(t.classList.contains("start-timer-btn")){const a=t.getAttribute("data-task-id"),o=t.getAttribute("data-task-title");try{const r=await(await fetch(`/api/tasks/${a}/timer`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"start"})})).json();r.success?(n(`Timer started for: ${o}`,"success"),window.location.reload()):n("Error: "+r.error,"error")}catch{n("Network error starting timer","error")}}if(t.classList.contains("complete-task-btn")){const a=t.getAttribute("data-task-id");try{const e=await(await fetch(`/api/tasks/${a}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:"completed",completed_at:new Date().toISOString()})})).json();e.success?(n("Task completed!","success"),window.location.reload()):n("Error: "+e.error,"error")}catch{n("Network error completing task","error")}}if(t.classList.contains("pause-task-btn")){const a=t.getAttribute("data-task-id");try{const e=await(await fetch(`/api/tasks/${a}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:"on_hold"})})).json();e.success?(n("Task paused","success"),window.location.reload()):n("Error: "+e.error,"error")}catch{n("Network error pausing task","error")}}if(t.classList.contains("resume-task-btn")){const a=t.getAttribute("data-task-id");try{const e=await(await fetch(`/api/tasks/${a}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:"todo"})})).json();e.success?(n("Task resumed","success"),window.location.reload()):n("Error: "+e.error,"error")}catch{n("Network error resuming task","error")}}if(t.id==="stop-timer-btn"){const a=prompt("Rate your productivity (1-10):"),o=prompt("Rate your energy level (1-10):"),e=confirm("Did you complete the task?"),r=t.getAttribute("data-task-id");try{const i=await(await fetch(`/api/tasks/${r}/timer`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"stop",productivity_score:a?parseInt(a):void 0,energy_level:o?parseInt(o):void 0,task_completed:e})})).json();i.success?(n(`Session completed! Duration: ${i.duration} minutes`,"success"),window.location.reload()):n("Error: "+i.error,"error")}catch{n("Network error stopping timer","error")}}});document.getElementById("new-task-form")?.addEventListener("submit",async s=>{s.preventDefault();const t=new FormData(s.target),a=[];t.getAll("context").forEach(e=>a.push(e));const o={title:t.get("title"),description:t.get("description"),category:t.get("category"),priority:t.get("priority"),estimated_duration:t.get("estimated_duration")?parseInt(t.get("estimated_duration")):null,due_date:t.get("due_date")||null,scheduled_for:t.get("scheduled_for")||null,energy_required:t.get("energy_required"),complexity:t.get("complexity"),location:t.get("location"),tags:t.get("tags")?t.get("tags").split(",").map(e=>e.trim()):[],context:a,email_reminders:t.get("email_reminders")==="on"};try{const r=await(await fetch("/api/tasks",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(o)})).json();r.success?(n("Task created successfully!","success"),window.location.reload()):n("Error: "+r.error,"error")}catch{n("Network error creating task","error")}});async function c(s){const t=document.getElementById("ai-assistant-content");t.innerHTML=`
      <div class="text-center py-8">
        <div class="animate-spin w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p class="text-text-secondary">AI is analyzing your ${s.replace("_"," ")}...</p>
      </div>
    `;try{const o=await(await fetch("/api/tasks/ai-assistant",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:s})})).json();o.success?l(o.analysis,s):t.innerHTML=`<p class="text-accent-error">Failed to load AI analysis: ${o.error}</p>`}catch{t.innerHTML='<p class="text-accent-error">Network error loading AI analysis</p>'}}function l(s,t){const a=document.getElementById("ai-assistant-content");let o=`
      <div class="space-y-6">
        <div class="flex space-x-2 mb-6">
          <button onclick="loadAIAnalysis('productivity_analysis')" class="px-4 py-2 bg-accent-primary text-white rounded hover:bg-accent-primary/90">
            Productivity Analysis
          </button>
          <button onclick="loadAIAnalysis('task_prioritization')" class="px-4 py-2 bg-accent-success text-white rounded hover:bg-accent-success/90">
            Task Prioritization
          </button>
          <button onclick="loadAIAnalysis('time_blocking')" class="px-4 py-2 bg-accent-purple text-white rounded hover:bg-accent-purple/90">
            Time Blocking
          </button>
        </div>
    `;s.insights&&(o+=`
        <div>
          <h4 class="text-lg font-semibold text-text-primary mb-3">📊 Insights</h4>
          <div class="space-y-3">
            ${s.insights.map(e=>`
              <div class="p-4 bg-accent-primary/10 rounded-lg">
                <h5 class="font-medium text-text-primary">${e.title}</h5>
                <p class="text-text-secondary text-sm mt-1">${e.description}</p>
                ${e.recommendation?`<p class="text-accent-primary text-sm mt-2 font-medium">💡 ${e.recommendation}</p>`:""}
              </div>
            `).join("")}
          </div>
        </div>
      `),s.optimizations&&(o+=`
        <div>
          <h4 class="text-lg font-semibold text-text-primary mb-3">🚀 Optimizations</h4>
          <div class="space-y-3">
            ${s.optimizations.map(e=>`
              <div class="p-4 bg-accent-success/10 rounded-lg">
                <h5 class="font-medium text-text-primary">${e.area}</h5>
                <p class="text-text-secondary text-sm mt-1">${e.current_issue}</p>
                <p class="text-accent-success text-sm mt-2 font-medium">✅ ${e.solution}</p>
                <p class="text-text-muted text-xs mt-1">Expected: ${e.expected_impact} | Difficulty: ${e.difficulty}</p>
              </div>
            `).join("")}
          </div>
        </div>
      `),s.focus_suggestions&&(o+=`
        <div>
          <h4 class="text-lg font-semibold text-text-primary mb-3">🎯 Focus Suggestions</h4>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="p-4 bg-accent-warning/10 rounded-lg">
              <h5 class="font-medium text-text-primary">Today</h5>
              <p class="text-text-secondary text-sm mt-1">${s.focus_suggestions.today}</p>
            </div>
            <div class="p-4 bg-accent-warning/10 rounded-lg">
              <h5 class="font-medium text-text-primary">This Week</h5>
              <p class="text-text-secondary text-sm mt-1">${s.focus_suggestions.this_week}</p>
            </div>
            <div class="p-4 bg-accent-purple/10 rounded-lg">
              <h5 class="font-medium text-text-primary">Energy</h5>
              <p class="text-text-secondary text-sm mt-1">${s.focus_suggestions.energy_optimization}</p>
            </div>
          </div>
        </div>
      `),o+="</div>",a.innerHTML=o}function n(s,t){const a=document.createElement("div");a.className=`fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 text-white ${t==="success"?"bg-green-600":t==="error"?"bg-red-600":"bg-yellow-600"}`,a.textContent=s,document.body.appendChild(a),setTimeout(()=>{a.remove()},3e3)}window.loadAIAnalysis=c;
