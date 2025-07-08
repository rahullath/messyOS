import { c as createComponent, r as renderComponent, b as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_BxgriC_5.mjs';
import 'kleur/colors';
import { $ as $$DashboardLayout } from '../chunks/DashboardLayout_BPLTWs40.mjs';
import { jsxs, jsx } from 'react/jsx-runtime';
import { useState } from 'react';
/* empty css                                  */
export { renderers } from '../renderers.mjs';

function LoopHabitsImport() {
  const [files, setFiles] = useState({});
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState("");
  const handleFileChange = (type, file) => {
    setFiles((prev) => ({ ...prev, [type]: file }));
  };
  const handleImport = async () => {
    if (!files.habits || !files.checkmarks || !files.scores) {
      alert("Please select all three CSV files");
      return;
    }
    setIsImporting(true);
    setResult("");
    try {
      const formData = new FormData();
      formData.append("userId", "368deac7-8526-45eb-927a-6a373c95d8c6");
      formData.append("habits", files.habits);
      formData.append("checkmarks", files.checkmarks);
      formData.append("scores", files.scores);
      const response = await fetch("/api/import/loop-habits", {
        method: "POST",
        body: formData
      });
      const data = await response.json();
      if (data.success) {
        setResult(`✅ ${data.message}`);
        setTimeout(() => window.location.reload(), 2e3);
      } else {
        setResult(`❌ ${data.message}`);
      }
    } catch (error) {
      setResult(`❌ Import failed: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "card p-6", children: [
    /* @__PURE__ */ jsx("h3", { className: "text-xl font-semibold text-text-primary mb-4", children: "Import Loop Habits Data" }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-text-secondary mb-2", children: "Habits.csv" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "file",
            accept: ".csv",
            onChange: (e) => e.target.files?.[0] && handleFileChange("habits", e.target.files[0]),
            className: "w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-text-secondary mb-2", children: "Checkmarks.csv" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "file",
            accept: ".csv",
            onChange: (e) => e.target.files?.[0] && handleFileChange("checkmarks", e.target.files[0]),
            className: "w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-text-secondary mb-2", children: "Scores.csv" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "file",
            accept: ".csv",
            onChange: (e) => e.target.files?.[0] && handleFileChange("scores", e.target.files[0]),
            className: "w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary"
          }
        )
      ] }),
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: handleImport,
          disabled: isImporting || !files.habits || !files.checkmarks || !files.scores,
          className: "w-full px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
          children: isImporting ? "Importing..." : "Import Habits"
        }
      ),
      result && /* @__PURE__ */ jsx("div", { className: "p-3 bg-surface border border-border rounded-lg", children: /* @__PURE__ */ jsx("p", { className: "text-sm text-text-primary", children: result }) })
    ] })
  ] });
}

function FinanceDataImport() {
  const [files, setFiles] = useState({});
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState("");
  const handleFileChange = (type, file) => {
    setFiles((prev) => ({ ...prev, [type]: file }));
  };
  const handleImport = async () => {
    if (!files.bank && !files.crypto && !files.expenses) {
      alert("Please select at least one file to import");
      return;
    }
    setIsImporting(true);
    setResult("");
    try {
      const formData = new FormData();
      formData.append("userId", "368deac7-8526-45eb-927a-6a373c95d8c6");
      if (files.bank) formData.append("bank", files.bank);
      if (files.crypto) formData.append("crypto", files.crypto);
      if (files.expenses) formData.append("expenses", files.expenses);
      const response = await fetch("/api/import/finance", {
        method: "POST",
        body: formData
      });
      const data = await response.json();
      if (data.success) {
        setResult(`✅ ${data.message}`);
        setTimeout(() => window.location.reload(), 2e3);
      } else {
        setResult(`❌ ${data.message}`);
      }
    } catch (error) {
      setResult(`❌ Import failed: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "card p-6", children: [
    /* @__PURE__ */ jsx("h3", { className: "text-xl font-semibold text-text-primary mb-4", children: "Import Finance Data" }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-text-secondary mb-2", children: "Bank Statement CSV (Optional)" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "file",
            accept: ".csv",
            onChange: (e) => e.target.files?.[0] && handleFileChange("bank", e.target.files[0]),
            className: "w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-text-secondary mb-2", children: "Crypto Holdings (cryptoholdings.txt)" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "file",
            accept: ".txt",
            onChange: (e) => e.target.files?.[0] && handleFileChange("crypto", e.target.files[0]),
            className: "w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-text-secondary mb-2", children: "Manual Expenses (expenses.txt)" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "file",
            accept: ".txt",
            onChange: (e) => e.target.files?.[0] && handleFileChange("expenses", e.target.files[0]),
            className: "w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary"
          }
        )
      ] }),
      /* @__PURE__ */ jsx("div", { className: "space-y-2", children: /* @__PURE__ */ jsxs("div", { className: "text-sm", children: [
        /* @__PURE__ */ jsx("span", { className: "text-text-muted", children: "Files selected:" }),
        /* @__PURE__ */ jsxs("div", { className: "mt-1 space-y-1", children: [
          files.bank && /* @__PURE__ */ jsxs("div", { className: "text-accent-success", children: [
            "✓ Bank Statement: ",
            files.bank.name
          ] }),
          files.crypto && /* @__PURE__ */ jsxs("div", { className: "text-accent-success", children: [
            "✓ Crypto Holdings: ",
            files.crypto.name
          ] }),
          files.expenses && /* @__PURE__ */ jsxs("div", { className: "text-accent-success", children: [
            "✓ Manual Expenses: ",
            files.expenses.name
          ] }),
          !files.bank && !files.crypto && !files.expenses && /* @__PURE__ */ jsx("div", { className: "text-text-muted", children: "No files selected" })
        ] })
      ] }) }),
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: handleImport,
          disabled: isImporting || !files.bank && !files.crypto && !files.expenses,
          className: "w-full px-4 py-2 bg-accent-warning text-white rounded-lg hover:bg-accent-warning/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
          children: isImporting ? "Importing..." : "Import Finance Data"
        }
      ),
      result && /* @__PURE__ */ jsx("div", { className: "p-3 bg-surface border border-border rounded-lg", children: /* @__PURE__ */ jsx("p", { className: "text-sm text-text-primary", children: result }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mt-6 p-4 bg-accent-warning/5 border border-accent-warning/20 rounded-lg", children: [
      /* @__PURE__ */ jsx("h4", { className: "font-medium text-accent-warning mb-2", children: "📊 Expected Data from Your Files" }),
      /* @__PURE__ */ jsxs("div", { className: "text-sm text-text-secondary space-y-1", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("strong", { children: "Crypto:" }),
          " 11 holdings worth $130.72 (USDC, TRX, SOL, ETH, etc.)"
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("strong", { children: "Expenses:" }),
          " ~50+ transactions from Zepto, Swiggy, Blinkit, Supertails"
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("strong", { children: "Categories:" }),
          " Food, Pet Care, Groceries, Fitness, Personal Care"
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("strong", { children: "Total Value:" }),
          " ~₹25,000+ in expenses tracked"
        ] })
      ] })
    ] })
  ] });
}

function ContentDataImport() {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
    }
  };
  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("serializd_data", file);
      const response = await fetch("/api/content/import/serializd", {
        method: "POST",
        body: formData
      });
      const data = await response.json();
      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || "Import failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };
  const resetImport = () => {
    setFile(null);
    setResult(null);
    setError(null);
    const fileInput = document.getElementById("content-file-input");
    if (fileInput) fileInput.value = "";
  };
  return /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-lg shadow-md p-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 mb-6", children: [
      /* @__PURE__ */ jsx("div", { className: "w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center", children: /* @__PURE__ */ jsx("svg", { className: "w-5 h-5 text-purple-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" }) }) }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h3", { className: "text-lg font-semibold text-gray-900", children: "Serializd Content Import" }),
        /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-600", children: "Import your enriched Serializd export data" })
      ] })
    ] }),
    !result && /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("label", { htmlFor: "content-file-input", className: "block text-sm font-medium text-gray-700 mb-2", children: "Select Serializd Export File" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            id: "content-file-input",
            type: "file",
            accept: ".csv,.json,text/csv,application/json",
            onChange: handleFileChange,
            className: "block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
          }
        ),
        /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs text-gray-500", children: "Supports enriched CSV and JSON exports from Serializd with TMDB data" })
      ] }),
      file && /* @__PURE__ */ jsx("div", { className: "bg-gray-50 rounded-md p-4", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-gray-700", children: file.name }),
          /* @__PURE__ */ jsxs("p", { className: "text-xs text-gray-500", children: [
            (file.size / 1024).toFixed(1),
            " KB • ",
            file.type || "Unknown type"
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "text-xs text-gray-500", children: file.name.endsWith(".json") ? "📊 JSON" : "📋 CSV" })
      ] }) }),
      /* @__PURE__ */ jsxs("div", { className: "bg-blue-50 border border-blue-200 rounded-md p-4", children: [
        /* @__PURE__ */ jsx("h4", { className: "text-sm font-medium text-blue-900 mb-2", children: "Enhanced Serializd Format Expected:" }),
        /* @__PURE__ */ jsxs("div", { className: "text-xs text-blue-800 space-y-2", children: [
          /* @__PURE__ */ jsxs("p", { children: [
            /* @__PURE__ */ jsx("strong", { children: "Required fields:" }),
            " Title, Rating, Watch_Date, TMDB_ID"
          ] }),
          /* @__PURE__ */ jsxs("p", { children: [
            /* @__PURE__ */ jsx("strong", { children: "Enhanced fields:" }),
            " Genres, Cast, Overview, Season_Episode, Review_Text"
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "mt-2 p-2 bg-blue-100 rounded text-blue-700", children: [
            /* @__PURE__ */ jsx("p", { children: /* @__PURE__ */ jsx("strong", { children: "✨ This importer handles:" }) }),
            /* @__PURE__ */ jsxs("ul", { className: "list-disc list-inside text-xs mt-1 space-y-1", children: [
              /* @__PURE__ */ jsx("li", { children: "Rich TMDB metadata (cast, genres, ratings)" }),
              /* @__PURE__ */ jsx("li", { children: "TV shows with season/episode tracking" }),
              /* @__PURE__ */ jsx("li", { children: "Personal reviews and ratings" }),
              /* @__PURE__ */ jsx("li", { children: "Duplicate detection and prevention" }),
              /* @__PURE__ */ jsx("li", { children: "Batch processing for large imports" })
            ] })
          ] })
        ] })
      ] }),
      error && /* @__PURE__ */ jsxs("div", { className: "bg-red-50 border border-red-200 rounded-md p-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx("svg", { className: "w-5 h-5 text-red-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" }) }),
          /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-red-900", children: "Import Error" })
        ] }),
        /* @__PURE__ */ jsx("p", { className: "text-sm text-red-800 mt-1", children: error })
      ] }),
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: handleImport,
          disabled: !file || importing,
          className: "w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors",
          children: importing ? /* @__PURE__ */ jsxs("span", { className: "flex items-center justify-center gap-2", children: [
            /* @__PURE__ */ jsxs("svg", { className: "animate-spin h-4 w-4", fill: "none", viewBox: "0 0 24 24", children: [
              /* @__PURE__ */ jsx("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }),
              /* @__PURE__ */ jsx("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })
            ] }),
            "Processing Serializd Data..."
          ] }) : "Import Serializd Content"
        }
      )
    ] }),
    result && /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "bg-green-50 border border-green-200 rounded-md p-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mb-3", children: [
          /* @__PURE__ */ jsx("svg", { className: "w-5 h-5 text-green-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M5 13l4 4L19 7" }) }),
          /* @__PURE__ */ jsx("h4", { className: "text-sm font-medium text-green-900", children: "Import Successful!" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4 mb-4", children: [
          /* @__PURE__ */ jsxs("div", { className: "text-center", children: [
            /* @__PURE__ */ jsx("div", { className: "text-lg font-bold text-green-700", children: result.stats.imported }),
            /* @__PURE__ */ jsx("div", { className: "text-xs text-green-600", children: "Imported" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "text-center", children: [
            /* @__PURE__ */ jsx("div", { className: "text-lg font-bold text-gray-700", children: result.stats.duplicates }),
            /* @__PURE__ */ jsx("div", { className: "text-xs text-gray-600", children: "Duplicates" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "text-center", children: [
            /* @__PURE__ */ jsx("div", { className: "text-lg font-bold text-blue-700", children: result.stats.movies }),
            /* @__PURE__ */ jsx("div", { className: "text-xs text-blue-600", children: "Movies" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "text-center", children: [
            /* @__PURE__ */ jsx("div", { className: "text-lg font-bold text-purple-700", children: result.stats.tv_shows }),
            /* @__PURE__ */ jsx("div", { className: "text-xs text-purple-600", children: "TV Shows" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "text-sm text-green-800 space-y-2", children: [
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { children: /* @__PURE__ */ jsx("strong", { children: "📊 Content Stats:" }) }),
              /* @__PURE__ */ jsxs("ul", { className: "text-xs space-y-1 ml-4", children: [
                /* @__PURE__ */ jsxs("li", { children: [
                  "• Total processed: ",
                  result.stats.total
                ] }),
                /* @__PURE__ */ jsxs("li", { children: [
                  "• Rated entries: ",
                  result.stats.rated_entries
                ] }),
                /* @__PURE__ */ jsxs("li", { children: [
                  "• Average rating: ",
                  result.stats.avg_rating.toFixed(1),
                  "/10"
                ] }),
                /* @__PURE__ */ jsxs("li", { children: [
                  "• Date range: ",
                  result.stats.date_range
                ] })
              ] })
            ] }),
            result.stats.top_genres.length > 0 && /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { children: /* @__PURE__ */ jsx("strong", { children: "🎭 Top Genres:" }) }),
              /* @__PURE__ */ jsx("ul", { className: "text-xs space-y-1 ml-4", children: result.stats.top_genres.slice(0, 3).map((genre, index) => /* @__PURE__ */ jsxs("li", { children: [
                "• ",
                genre.genre,
                " (",
                genre.count,
                ")"
              ] }, index)) })
            ] })
          ] }),
          result.errors && result.errors.length > 0 && /* @__PURE__ */ jsxs("div", { className: "mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded", children: [
            /* @__PURE__ */ jsx("p", { className: "font-medium text-yellow-900", children: "⚠️ Warnings:" }),
            /* @__PURE__ */ jsx("ul", { className: "list-disc list-inside text-xs text-yellow-800 mt-1", children: result.errors.map((error2, index) => /* @__PURE__ */ jsx("li", { children: error2 }, index)) })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-3", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: resetImport,
            className: "flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors",
            children: "Import Another File"
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => window.location.href = "/content",
            className: "flex-1 bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition-colors",
            children: "View Content Library →"
          }
        )
      ] })
    ] })
  ] });
}

const $$Import = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Import Data - MeshOS", "class": "astro-rda2k54p" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="space-y-8 astro-rda2k54p"> <!-- Header --> <div class="astro-rda2k54p"> <h1 class="text-3xl font-semibold text-text-primary mb-4 astro-rda2k54p">Import Data</h1> <p class="text-text-secondary mb-8 astro-rda2k54p">
Import your historical data from various apps and services to get a complete picture of your life.
</p> </div> <!-- Import Cards Grid --> <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 astro-rda2k54p"> <!-- Loop Habits Import --> <div class="space-y-6 astro-rda2k54p"> <div class="flex items-center space-x-3 mb-4 astro-rda2k54p"> <div class="w-8 h-8 bg-accent-success/20 rounded-lg flex items-center justify-center astro-rda2k54p"> <svg class="w-5 h-5 text-accent-success astro-rda2k54p" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" class="astro-rda2k54p"></path> </svg> </div> <div class="astro-rda2k54p"> <h2 class="text-xl font-semibold text-text-primary astro-rda2k54p">Habits Data</h2> <p class="text-sm text-text-muted astro-rda2k54p">From Loop Habits app</p> </div> </div> ${renderComponent($$result2, "LoopHabitsImport", LoopHabitsImport, { "client:load": true, "client:component-hydration": "load", "client:component-path": "C:/Users/rahul/meshos-v3/src/components/import/LoopHabitsImport.tsx", "client:component-export": "default", "class": "astro-rda2k54p" })} <!-- Import Instructions --> <div class="card p-4 bg-accent-success/5 border border-accent-success/20 astro-rda2k54p"> <h4 class="font-medium text-accent-success mb-2 astro-rda2k54p">📱 How to Export from Loop Habits</h4> <ol class="text-sm text-text-secondary space-y-1 list-decimal list-inside astro-rda2k54p"> <li class="astro-rda2k54p">Open Loop Habits app</li> <li class="astro-rda2k54p">Go to Settings → Export</li> <li class="astro-rda2k54p">Select "Export as CSV"</li> <li class="astro-rda2k54p">Choose all three files: Habits.csv, Checkmarks.csv, Scores.csv</li> <li class="astro-rda2k54p">Upload them above</li> </ol> </div> </div> <!-- Finance Import --> <div class="space-y-6 astro-rda2k54p"> <div class="flex items-center space-x-3 mb-4 astro-rda2k54p"> <div class="w-8 h-8 bg-accent-warning/20 rounded-lg flex items-center justify-center astro-rda2k54p"> <svg class="w-5 h-5 text-accent-warning astro-rda2k54p" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" class="astro-rda2k54p"></path> </svg> </div> <div class="astro-rda2k54p"> <h2 class="text-xl font-semibold text-text-primary astro-rda2k54p">Finance Data</h2> <p class="text-sm text-text-muted astro-rda2k54p">Bank statements & crypto portfolio</p> </div> </div> ${renderComponent($$result2, "FinanceDataImport", FinanceDataImport, { "client:load": true, "client:component-hydration": "load", "client:component-path": "C:/Users/rahul/meshos-v3/src/components/import/FinanceDataImport.tsx", "client:component-export": "default", "class": "astro-rda2k54p" })} <!-- Finance Import Instructions --> <div class="card p-4 bg-accent-warning/5 border border-accent-warning/20 astro-rda2k54p"> <h4 class="font-medium text-accent-warning mb-2 astro-rda2k54p">💰 Supported Finance Data</h4> <ul class="text-sm text-text-secondary space-y-1 list-disc list-inside astro-rda2k54p"> <li class="astro-rda2k54p"><strong class="astro-rda2k54p">Bank Statements:</strong> CSV format from Jupiter Bank</li> <li class="astro-rda2k54p"><strong class="astro-rda2k54p">Crypto Portfolio:</strong> Text format with holdings</li> <li class="astro-rda2k54p"><strong class="astro-rda2k54p">Subscription List:</strong> Manual text input</li> </ul> </div> </div> <!-- Content Import --> <div class="space-y-6 astro-rda2k54p"> <div class="flex items-center space-x-3 mb-4 astro-rda2k54p"> <div class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center astro-rda2k54p"> <svg class="w-5 h-5 text-purple-600 astro-rda2k54p" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 110 2h-1v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6H3a1 1 0 110-2h4zM9 6h6V4H9v2zm0 3a1 1 0 112 0v6a1 1 0 11-2 0V9zm4 0a1 1 0 112 0v6a1 1 0 11-2 0V9z" class="astro-rda2k54p"></path> </svg> </div> <div class="astro-rda2k54p"> <h2 class="text-xl font-semibold text-text-primary astro-rda2k54p">Content Data</h2> <p class="text-sm text-text-muted astro-rda2k54p">Movies, TV shows, books & more</p> </div> </div> ${renderComponent($$result2, "ContentDataImport", ContentDataImport, { "client:load": true, "client:component-hydration": "load", "client:component-path": "C:/Users/rahul/meshos-v3/src/components/import/ContentDataImport.tsx", "client:component-export": "default", "class": "astro-rda2k54p" })} <!-- Content Import Instructions --> <div class="card p-4 bg-purple-50 border border-purple-200 astro-rda2k54p"> <h4 class="font-medium text-purple-600 mb-2 astro-rda2k54p">🎬 Supported Content Data</h4> <ul class="text-sm text-text-secondary space-y-1 list-disc list-inside astro-rda2k54p"> <li class="astro-rda2k54p"><strong class="astro-rda2k54p">CSV Format:</strong> Title,Status,Rating,Seasons,Page</li> <li class="astro-rda2k54p"><strong class="astro-rda2k54p">JSON Format:</strong> Array of content objects</li> <li class="astro-rda2k54p"><strong class="astro-rda2k54p">Status:</strong> "Watched", "Watching", "Planned", etc.</li> <li class="astro-rda2k54p"><strong class="astro-rda2k54p">Rating & Seasons:</strong> Numbers or "N/A"</li> </ul> </div> </div> </div> <!-- Health Data Import --> <div class="space-y-6 astro-rda2k54p"> <div class="flex items-center space-x-3 mb-4 astro-rda2k54p"> <div class="w-8 h-8 bg-accent-error/20 rounded-lg flex items-center justify-center astro-rda2k54p"> <svg class="w-5 h-5 text-accent-error astro-rda2k54p" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" class="astro-rda2k54p"></path> </svg> </div> <div class="astro-rda2k54p"> <h2 class="text-xl font-semibold text-text-primary astro-rda2k54p">Health Data</h2> <p class="text-sm text-text-muted astro-rda2k54p">From Huawei Band 9</p> </div> </div> <!-- Health Import Component (you'll need to create this) --> <div class="card p-6 astro-rda2k54p"> <h3 class="text-lg font-semibold text-text-primary mb-4 astro-rda2k54p">Import Health Metrics</h3> <div class="space-y-4 astro-rda2k54p"> <div class="astro-rda2k54p"> <label class="block text-sm font-medium text-text-secondary mb-2 astro-rda2k54p">Sleep Data (sleep.txt)</label> <input type="file" accept=".txt" class="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary astro-rda2k54p"> </div> <div class="astro-rda2k54p"> <label class="block text-sm font-medium text-text-secondary mb-2 astro-rda2k54p">Heart Rate Data (heartrate.txt)</label> <input type="file" accept=".txt" class="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary astro-rda2k54p"> </div> <div class="astro-rda2k54p"> <label class="block text-sm font-medium text-text-secondary mb-2 astro-rda2k54p">Stress Data (stress.txt)</label> <input type="file" accept=".txt" class="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary astro-rda2k54p"> </div> <button class="w-full px-4 py-2 bg-accent-error text-white rounded-lg hover:bg-accent-error/90 transition-colors astro-rda2k54p">
Import Health Data
</button> </div> </div> <!-- Health Import Instructions --> <div class="card p-4 bg-accent-error/5 border border-accent-error/20 astro-rda2k54p"> <h4 class="font-medium text-accent-error mb-2 astro-rda2k54p">❤️ How to Export from Huawei Health</h4> <ol class="text-sm text-text-secondary space-y-1 list-decimal list-inside astro-rda2k54p"> <li class="astro-rda2k54p">Open Huawei Health app</li> <li class="astro-rda2k54p">Go to Me → Settings → Data Management</li> <li class="astro-rda2k54p">Export data as TXT format</li> <li class="astro-rda2k54p">Upload Sleep, Heart Rate, and Stress files above</li> </ol> </div> </div> <!-- Import Status & Tips --> <div class="grid grid-cols-1 md:grid-cols-2 gap-6 astro-rda2k54p"> <!-- Import Status --> <div class="card p-6 astro-rda2k54p"> <h3 class="text-lg font-semibold text-text-primary mb-4 astro-rda2k54p">Import Status</h3> <div class="space-y-3 astro-rda2k54p"> <div class="flex items-center justify-between astro-rda2k54p"> <div class="flex items-center space-x-2 astro-rda2k54p"> <div class="w-2 h-2 bg-accent-success rounded-full astro-rda2k54p"></div> <span class="text-sm text-text-secondary astro-rda2k54p">Habits Data</span> </div> <span class="text-sm text-accent-success astro-rda2k54p">✅ 10 habits, 896 entries</span> </div> <div class="flex items-center justify-between astro-rda2k54p"> <div class="flex items-center space-x-2 astro-rda2k54p"> <div class="w-2 h-2 bg-accent-warning rounded-full astro-rda2k54p"></div> <span class="text-sm text-text-secondary astro-rda2k54p">Finance Data</span> </div> <span class="text-sm text-text-muted astro-rda2k54p">Ready for import</span> </div> <div class="flex items-center justify-between astro-rda2k54p"> <div class="flex items-center space-x-2 astro-rda2k54p"> <div class="w-2 h-2 bg-purple-500 rounded-full astro-rda2k54p"></div> <span class="text-sm text-text-secondary astro-rda2k54p">Content Data</span> </div> <span class="text-sm text-text-muted astro-rda2k54p">Ready for import</span> </div> <div class="flex items-center justify-between astro-rda2k54p"> <div class="flex items-center space-x-2 astro-rda2k54p"> <div class="w-2 h-2 bg-accent-error rounded-full astro-rda2k54p"></div> <span class="text-sm text-text-secondary astro-rda2k54p">Health Data</span> </div> <span class="text-sm text-accent-success astro-rda2k54p">✅ Sleep, HR, Stress imported</span> </div> </div> </div> <!-- Import Tips --> <div class="card p-6 astro-rda2k54p"> <h3 class="text-lg font-semibold text-text-primary mb-4 astro-rda2k54p">Import Tips</h3> <div class="space-y-3 text-sm text-text-secondary astro-rda2k54p"> <div class="flex items-start space-x-2 astro-rda2k54p"> <span class="text-accent-success mt-0.5 astro-rda2k54p">💡</span> <span class="astro-rda2k54p">Import habits data first to establish your baseline patterns</span> </div> <div class="flex items-start space-x-2 astro-rda2k54p"> <span class="text-accent-warning mt-0.5 astro-rda2k54p">⚠️</span> <span class="astro-rda2k54p">Large files may take a few minutes to process</span> </div> <div class="flex items-start space-x-2 astro-rda2k54p"> <span class="text-accent-primary mt-0.5 astro-rda2k54p">🔄</span> <span class="astro-rda2k54p">You can re-import data to update with new entries</span> </div> <div class="flex items-start space-x-2 astro-rda2k54p"> <span class="text-accent-purple mt-0.5 astro-rda2k54p">🚀</span> <span class="astro-rda2k54p">More import sources coming based on your usage patterns</span> </div> </div> </div> </div> <!-- Quick Data Preview --> <div class="card p-6 astro-rda2k54p"> <h3 class="text-lg font-semibold text-text-primary mb-4 astro-rda2k54p">Your Current Data Overview</h3> <div class="grid grid-cols-2 md:grid-cols-4 gap-4 astro-rda2k54p"> <div class="text-center astro-rda2k54p"> <div class="text-2xl font-bold text-accent-success astro-rda2k54p">10</div> <div class="text-sm text-text-muted astro-rda2k54p">Active Habits</div> </div> <div class="text-center astro-rda2k54p"> <div class="text-2xl font-bold text-accent-primary astro-rda2k54p">896</div> <div class="text-sm text-text-muted astro-rda2k54p">Habit Entries</div> </div> <div class="text-center astro-rda2k54p"> <div class="text-2xl font-bold text-accent-warning astro-rda2k54p">$130.72</div> <div class="text-sm text-text-muted astro-rda2k54p">Crypto Portfolio</div> </div> <div class="text-center astro-rda2k54p"> <div class="text-2xl font-bold text-accent-purple astro-rda2k54p">117</div> <div class="text-sm text-text-muted astro-rda2k54p">Best Streak (days)</div> </div> </div> </div> <!-- Developer Debug Section (Optional) --> <details class="card p-6 astro-rda2k54p"> <summary class="cursor-pointer text-text-primary font-medium astro-rda2k54p">🔧 Developer Info</summary> <div class="mt-4 text-sm text-text-muted space-y-2 astro-rda2k54p"> <p class="astro-rda2k54p"><strong class="astro-rda2k54p">User ID:</strong> 368deac7-8526-45eb-927a-6a373c95d8c6</p> <p class="astro-rda2k54p"><strong class="astro-rda2k54p">Database:</strong> Supabase (mdhtpjpwwbuepsytgrva)</p> <p class="astro-rda2k54p"><strong class="astro-rda2k54p">Import Endpoints:</strong></p> <ul class="list-disc list-inside ml-4 space-y-1 astro-rda2k54p"> <li class="astro-rda2k54p"><code class="astro-rda2k54p">/api/import/loop-habits</code> - Habits CSV import</li> <li class="astro-rda2k54p"><code class="astro-rda2k54p">/api/import/finance</code> - Finance data import</li> <li class="astro-rda2k54p"><code class="astro-rda2k54p">/api/import/content</code> - Content CSV/JSON import</li> <li class="astro-rda2k54p"><code class="astro-rda2k54p">/api/import/health</code> - Health data (coming soon)</li> </ul> </div> </details> </div> ` })} `;
}, "C:/Users/rahul/meshos-v3/src/pages/import.astro", void 0);

const $$file = "C:/Users/rahul/meshos-v3/src/pages/import.astro";
const $$url = "/import";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Import,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
