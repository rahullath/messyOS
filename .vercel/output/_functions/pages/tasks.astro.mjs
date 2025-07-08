import { c as createComponent, a as createAstro, r as renderComponent, g as renderScript, b as renderTemplate, m as maybeRenderHead, e as addAttribute } from '../chunks/astro/server_BxgriC_5.mjs';
import 'kleur/colors';
import { $ as $$DashboardLayout } from '../chunks/DashboardLayout_BPLTWs40.mjs';
import { createServerClient } from '../chunks/server_CMU3AJFs.mjs';
export { renderers } from '../renderers.mjs';

const $$Astro = createAstro();
const $$Tasks = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Tasks;
  const supabase = createServerClient(Astro2.cookies);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Astro2.redirect("/login");
  }
  const { data: tasks, error: tasksError } = await supabase.from("tasks").select(`
    *,
    task_sessions(
      id, started_at, ended_at, duration, session_type, productivity_score, energy_level
    )
  `).eq("user_id", user.id).order("created_at", { ascending: false });
  const { data: activeSession } = await supabase.from("task_sessions").select("*, tasks(title)").eq("user_id", user.id).is("ended_at", null).single();
  const processedTasks = (tasks || []).map((task) => {
    const sessions = task.task_sessions || [];
    const totalDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const avgProductivity = sessions.length > 0 ? sessions.reduce((sum, s) => sum + (s.productivity_score || 0), 0) / sessions.length : 0;
    return {
      ...task,
      totalTimeSpent: totalDuration,
      avgProductivity: Math.round(avgProductivity * 10) / 10,
      isOverdue: task.due_date && new Date(task.due_date) < /* @__PURE__ */ new Date() && task.status !== "completed",
      isDueToday: task.due_date && new Date(task.due_date).toLocaleDateString() === (/* @__PURE__ */ new Date()).toLocaleDateString(),
      sessionCount: sessions.length
    };
  });
  const tasksByStatus = {
    todo: processedTasks.filter((t) => t.status === "todo"),
    in_progress: processedTasks.filter((t) => t.status === "in_progress"),
    completed: processedTasks.filter((t) => t.status === "completed").slice(0, 5),
    // Show only 5 recent completed tasks
    on_hold: processedTasks.filter((t) => t.status === "on_hold")
  };
  const calculateAvgTaskTime = (tasks2, status) => {
    const relevantTasks = tasks2.filter((t) => t.status === status);
    if (relevantTasks.length === 0) return 0;
    const totalTime = relevantTasks.reduce((sum, t) => sum + (t.totalTimeSpent || 0), 0);
    return Math.round(totalTime / relevantTasks.length / 60);
  };
  const categories = [
    "Work",
    "Personal",
    "Learning",
    "Health",
    "Finance",
    "Creative",
    "Social",
    "Maintenance",
    "Planning",
    "Other"
  ];
  const priorityLevels = [
    { value: "low", label: "Low", color: "green" },
    { value: "medium", label: "Medium", color: "yellow" },
    { value: "high", label: "High", color: "red" }
  ];
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Tasks - MeshOS" }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="space-y-6"> <!-- Header Section --> <div class="flex items-center justify-between"> <div> <h1 class="text-3xl font-bold text-gray-900">Task Management</h1> <p class="text-gray-600 mt-1">Organize and track your tasks efficiently</p> </div> <div class="flex items-center space-x-3"> <button id="new-task-btn" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"> <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path> </svg>
Add Task
</button> <a href="/ai-agent" class="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"> <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path> </svg>
AI Insights
</a> </div> </div> <!-- Task Stats --> <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"> ${Object.entries(tasksByStatus).map(([status, statusTasks]) => renderTemplate`<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6"> <div class="flex items-center justify-between"> <div> <h3 class="text-sm font-medium text-gray-600 uppercase tracking-wide"> ${status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ")} </h3> <p class="text-2xl font-bold text-gray-900 mt-2"> ${statusTasks.length} </p> </div> <div${addAttribute(`w-12 h-12 rounded-full flex items-center justify-center ${status === "todo" ? "bg-blue-100" : status === "in_progress" ? "bg-yellow-100" : status === "completed" ? "bg-green-100" : "bg-gray-100"}`, "class")}> ${status === "todo" && renderTemplate`<svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path> </svg>`} ${status === "in_progress" && renderTemplate`<svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path> </svg>`} ${status === "completed" && renderTemplate`<svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path> </svg>`} ${status === "on_hold" && renderTemplate`<svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"></path> </svg>`} </div> </div> <div class="mt-4 text-sm text-gray-500">
Avg time: ${calculateAvgTaskTime(processedTasks, status)} mins
</div> </div>`)} </div> <!-- Task Boards --> <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6"> ${Object.entries(tasksByStatus).map(([status, statusTasks]) => renderTemplate`<div class="bg-white rounded-lg shadow-sm border border-gray-200"> <div class="p-4 border-b border-gray-200"> <h3 class="text-lg font-semibold text-gray-900"> ${status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ")} </h3> <p class="text-sm text-gray-500">${statusTasks.length} tasks</p> </div> <div class="p-4 space-y-3 max-h-96 overflow-y-auto"> ${statusTasks.length === 0 ? renderTemplate`<div class="text-center py-8 text-gray-500"> <svg class="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path> </svg> <p class="text-sm">No tasks yet</p> </div>` : statusTasks.map((task) => renderTemplate`<div class="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow"> <div class="flex items-start justify-between"> <div class="flex-1"> <h4 class="font-medium text-gray-900 text-sm">${task.title}</h4> ${task.description && renderTemplate`<p class="text-xs text-gray-600 mt-1 line-clamp-2">${task.description}</p>`} <div class="flex items-center gap-2 mt-2"> <span${addAttribute(`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${task.priority === "high" ? "bg-red-100 text-red-800" : task.priority === "medium" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}`, "class")}> ${task.priority} </span> ${task.due_date && renderTemplate`<span${addAttribute(`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${task.isOverdue ? "bg-red-100 text-red-800" : task.isDueToday ? "bg-orange-100 text-orange-800" : "bg-gray-100 text-gray-800"}`, "class")}> ${task.isOverdue ? "Overdue" : task.isDueToday ? "Due today" : new Date(task.due_date).toLocaleDateString()} </span>`} </div> </div> <div class="flex items-center gap-1 ml-2"> ${status !== "completed" && renderTemplate`<button class="p-1 text-green-600 hover:bg-green-50 rounded transition-colors start-btn"${addAttribute(task.id, "data-task-id")} title="Start task"> <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m6-10V7a3 3 0 11-6 0V4h6zM4 20h16"></path> </svg> </button>`} <button class="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors edit-btn"${addAttribute(task.id, "data-task-id")} title="Edit task"> <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path> </svg> </button> ${status !== "completed" && renderTemplate`<button class="p-1 text-green-600 hover:bg-green-50 rounded transition-colors complete-btn"${addAttribute(task.id, "data-task-id")} title="Mark complete"> <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path> </svg> </button>`} </div> </div> </div>`)} </div> </div>`)} </div> <!-- Active Task Timer --> ${activeSession && renderTemplate`<div id="active-timer" class="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 min-w-64"> <div class="flex items-center justify-between mb-2"> <h4 class="font-medium text-gray-900">Active Task</h4> <button id="stop-timer-btn" class="text-red-600 hover:bg-red-50 p-1 rounded"> <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10h6v4H9z"></path> </svg> </button> </div> <p class="text-sm text-gray-600 mb-2">${activeSession.tasks.title}</p> <div class="text-2xl font-bold text-blue-600" id="timer-display">00:00</div> </div>`} </div>  <div id="new-task-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50"> <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"> <div class="p-6"> <div class="flex items-center justify-between mb-4"> <h3 class="text-lg font-semibold text-gray-900">Add New Task</h3> <button id="close-new-task-modal" class="text-gray-400 hover:text-gray-600"> <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path> </svg> </button> </div> <form id="new-task-form" class="space-y-4"> <div> <label for="title" class="block text-sm font-medium text-gray-700 mb-1">Title *</label> <input id="title" name="title" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" required placeholder="Enter task title"> </div> <div> <label for="description" class="block text-sm font-medium text-gray-700 mb-1">Description</label> <textarea id="description" name="description" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Enter task description"></textarea> </div> <div class="grid grid-cols-2 gap-4"> <div> <label for="category" class="block text-sm font-medium text-gray-700 mb-1">Category *</label> <select id="category" name="category" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" required> <option value="">Select category</option> ${categories.map((cat) => renderTemplate`<option${addAttribute(cat, "value")}>${cat}</option>`)} </select> </div> <div> <label for="priority" class="block text-sm font-medium text-gray-700 mb-1">Priority</label> <select id="priority" name="priority" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"> ${priorityLevels.map((level) => renderTemplate`<option${addAttribute(level.value, "value")}${addAttribute(level.value === "medium", "selected")}>${level.label}</option>`)} </select> </div> </div> <div> <label for="due_date" class="block text-sm font-medium text-gray-700 mb-1">Due Date</label> <input id="due_date" name="due_date" type="date" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"> </div> <div class="flex justify-end space-x-3 pt-4"> <button type="button" id="cancel-new-task" class="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
Cancel
</button> <button type="submit" class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
Add Task
</button> </div> </form> </div> </div> </div> ` })} ${renderScript($$result, "C:/Users/rahul/meshos-v3/src/pages/tasks.astro?astro&type=script&index=0&lang.ts")}`;
}, "C:/Users/rahul/meshos-v3/src/pages/tasks.astro", void 0);

const $$file = "C:/Users/rahul/meshos-v3/src/pages/tasks.astro";
const $$url = "/tasks";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Tasks,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
