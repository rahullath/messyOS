document.getElementById("import-btn")?.addEventListener("click",()=>{document.getElementById("import-modal")?.classList.remove("hidden"),document.getElementById("import-modal")?.classList.add("flex")});document.getElementById("close-import")?.addEventListener("click",()=>{document.getElementById("import-modal")?.classList.add("hidden"),document.getElementById("import-modal")?.classList.remove("flex")});document.getElementById("import-modal")?.addEventListener("click",e=>{e.target===e.currentTarget&&(document.getElementById("import-modal")?.classList.add("hidden"),document.getElementById("import-modal")?.classList.remove("flex"))});window.logHabit=async function(e,t){b(e,t)};function b(e,t,l){const n=document.createElement("div");n.className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4",n.id="enhanced-logging-modal";const r=new Date().toTimeString().slice(0,5);n.innerHTML=`
    <div class="bg-gray-900 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <div class="p-6">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-2xl font-bold text-white">Log ${t}</h2>
            <p class="text-gray-400 text-sm">Enhanced logging with context</p>
          </div>
          <button onclick="closeEnhancedModal()" class="text-gray-400 hover:text-white">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <form id="enhanced-logging-form" class="space-y-6">
          <!-- Status -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-3">How did it go?</label>
            <div class="space-y-2">
              <button type="button" onclick="setStatus(1)" class="status-btn w-full p-3 rounded-lg border border-gray-600 bg-gray-800 hover:bg-gray-700 text-left text-green-400">
                ✅ Completed Successfully
              </button>
              
              <button type="button" onclick="setStatus(0)" class="status-btn w-full p-3 rounded-lg border border-gray-600 bg-gray-800 hover:bg-gray-700 text-left text-red-400">
                ❌ Failed
              </button>
            </div>
          </div>

          <!-- Timing -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Completion Time</label>
              <input type="time" id="completion-time" value="${r}" 
                     class="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Duration (minutes)</label>
              <input type="number" id="duration" placeholder="30" min="0" max="480"
                     class="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white">
            </div>
          </div>

          <!-- Effort & Energy -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Effort Level: <span id="effort-value">3</span>/5
              </label>
              <input type="range" id="effort" min="1" max="5" value="3" 
                     class="w-full accent-blue-500" 
                     oninput="document.getElementById('effort-value').textContent = this.value">
              <div class="flex justify-between text-xs text-gray-400 mt-1">
                <span>Easy</span><span>Hard</span>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Energy Level: <span id="energy-value">3</span>/5
              </label>
              <input type="range" id="energy" min="1" max="5" value="3" 
                     class="w-full accent-green-500"
                     oninput="document.getElementById('energy-value').textContent = this.value">
              <div class="flex justify-between text-xs text-gray-400 mt-1">
                <span>Low</span><span>High</span>
              </div>
            </div>
          </div>

          <!-- Mood -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Mood: <span id="mood-value">3</span>/5
            </label>
            <input type="range" id="mood" min="1" max="5" value="3" 
                   class="w-full accent-purple-500"
                   oninput="document.getElementById('mood-value').textContent = this.value">
            <div class="flex justify-between text-xs text-gray-400 mt-1">
              <span>😔 Low</span><span>😊 Great</span>
            </div>
          </div>

          <!-- Location & Weather -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Location</label>
              <select id="location" class="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white">
                <option value="">Select location</option>
                <option value="Home">Home</option>
                <option value="Gym">Gym</option>
                <option value="Office">Office</option>
                <option value="University">University</option>
                <option value="Outdoors">Outdoors</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Weather</label>
              <select id="weather" class="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white">
                <option value="">Select weather</option>
                <option value="Sunny">Sunny</option>
                <option value="Rainy">Rainy</option>
                <option value="Cloudy">Cloudy</option>
                <option value="Hot">Hot</option>
                <option value="Cold">Cold</option>
                <option value="Humid">Humid</option>
              </select>
            </div>
          </div>

          <!-- Context Tags -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Context (select all that apply)</label>
            <div class="grid grid-cols-3 gap-2" id="context-tags">
              ${["High Energy","Low Energy","Stressed","Relaxed","Motivated","Tired","Social","Alone","Weekend","Workday","Morning","Evening"].map(o=>`
                <button type="button" onclick="toggleContext('${o}')" 
                        class="context-tag px-3 py-2 text-sm rounded-lg border border-gray-600 bg-gray-800 hover:bg-gray-700 text-gray-300"
                        data-tag="${o}">
                  ${o}
                </button>
              `).join("")}
            </div>
          </div>

          <!-- Notes -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Notes (optional)</label>
            <textarea id="notes" rows="3" placeholder="How did it feel? Any insights?" 
                      class="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white resize-none"></textarea>
          </div>

          <!-- Submit -->
          <div class="flex space-x-3">
            <button type="button" onclick="closeEnhancedModal()" 
                    class="flex-1 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-500">
              Cancel
            </button>
            <button type="submit" 
                    class="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500">
              Log ${t}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,document.body.appendChild(n);const d=document.getElementById("enhanced-logging-form");d&&d.addEventListener("submit",async o=>{o.preventDefault(),await x(e,t)}),v(1)}let c=1,u=[];function v(e){c=e,document.querySelectorAll(".status-btn").forEach(l=>{l.classList.remove("border-blue-500","bg-blue-500/20"),l.classList.add("border-gray-600","bg-gray-800")});const t=event?.target;t&&(t.classList.remove("border-gray-600","bg-gray-800"),t.classList.add("border-blue-500","bg-blue-500/20"))}async function x(e,t){const l=document.getElementById("effort"),n=document.getElementById("duration"),r=document.getElementById("completion-time"),d=document.getElementById("energy"),o=document.getElementById("mood"),m=document.getElementById("location"),g=document.getElementById("weather"),p=document.getElementById("notes"),y={value:c,effort:l?parseInt(l.value):3,duration:n?.value?parseInt(n.value):null,completion_time:r?.value||"",energy_level:d?parseInt(d.value):3,mood:o?parseInt(o.value):3,location:m?.value||"",weather:g?.value||"",context:u,notes:p?.value||""};try{const a=await fetch(`/api/habits/${e}/log-enhanced`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(y)});if(a.ok){const i=await a.json(),s=document.createElement("div");s.className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50",s.innerHTML=`
        <div class="flex items-center space-x-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <span>✅ ${t} logged with context!</span>
        </div>
      `,document.body.appendChild(s),setTimeout(()=>{s.remove(),window.location.reload()},2e3),f()}else{const i=await a.json(),s=i instanceof Error?i.message:i.error||"Failed to log habit";throw new Error(s)}}catch(a){const i=a instanceof Error?a.message:"Unknown error occurred";alert(`Error: ${i}`)}}function f(){const e=document.getElementById("enhanced-logging-modal");e&&e.remove(),u=[],c=1}
