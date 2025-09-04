// import { useState, useEffect } from "react";
// import { FiFileText } from "react-icons/fi";
// import ReactMarkdown from "react-markdown";
// import remarkGfm from "remark-gfm";
// import { motion } from "framer-motion";

// function Assistant() {
//   const [activeTab, setActiveTab] = useState("assist");
//   const [query, setQuery] = useState("");
//   const [sources, setSources] = useState([]);
//   const [responses, setResponses] = useState([]);
//   const [loadingAsk, setLoadingAsk] = useState(false);
//   const [loadingUpload, setLoadingUpload] = useState(false);

//   // ✅ Handle PDF upload
//   const handleUpload = async (event) => {
//     const uploadedFile = event.target.files[0];
//     if (!uploadedFile) return;

//     setSources((prev) => [
//       ...prev,
//       { id: Date.now(), name: uploadedFile.name },
//     ]);

//     const formData = new FormData();
//     formData.append("file", uploadedFile);

  
//     try {
//       setLoadingUpload(true);
//       const res = await fetch("http://localhost:8000/api/upload", {
//         method: "POST",
//         body: formData,
//       });
//       if (!res.ok) throw new Error("Upload failed");
//     } catch (err) {
//       setResponses((prev) => [
//         ...prev,
//         { id: Date.now(), text: "⚠️ Error uploading file." },
//       ]);
//     } finally {
//       setLoadingUpload(false);
//     }
//   };

//   // ✅ Handle question asking
//   const handleAsk = async () => {
//     if (sources.length === 0) {
//       setResponses((prev) => [
//         ...prev,
//         { id: Date.now(), text: "⚠️ Please upload a PDF first!" },
//       ]);
//       return;
//     }

//     if (!query.trim()) return;

//     setLoadingAsk(true);

//     try {
//       const res = await fetch("http://localhost:8000/api/ask", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ question: query }),
//       });

//       const data = await res.json();
//       const responseText = data.answer || "⚠️ No response";

//       // ✅ Add with empty text first (for animation)
//       const newId = Date.now();
//       setResponses((prev) => [
//         ...prev,
//         { id: newId, text: "", fullText: responseText, question: query },
//       ]);
//       setQuery("");

//       // ✅ Animate text typing
//       let i = 0;
//       const interval = setInterval(() => {
//         setResponses((prev) =>
//           prev.map((r) =>
//             r.id === newId ? { ...r, text: r.fullText.slice(0, i + 1) } : r
//           )
//         );
//         i++;
//         if (i >= responseText.length) clearInterval(interval);
//       }, 20); // typing speed (ms per character)
//     } catch (err) {
//       setResponses((prev) => [
//         ...prev,
//         { id: Date.now(), text: "⚠️ Error fetching response." },
//       ]);
//     } finally {
//       setLoadingAsk(false);
//     }
//   };

//   return (
//     <div className="flex-1 flex flex-col h-full bg-gray-50">
//       {/* Tabs */}
//       <div className="border-b border-gray-200 px-6 bg-white shadow-sm">
//         <nav className="flex -mb-px space-x-8">
//           <button
//             onClick={() => setActiveTab("assist")}
//             className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
//               activeTab === "assist"
//                 ? "border-blue-500 text-gray-900"
//                 : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
//             }`}
//           >
//             Assist
//           </button>
//           <button
//             onClick={() => setActiveTab("draft")}
//             className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
//               activeTab === "draft"
//                 ? "border-blue-500 text-gray-900"
//                 : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
//             }`}
//           >
//             Draft
//           </button>
//         </nav>
//       </div>

//       {/* Main Content */}
//       <div className="flex-1 overflow-y-auto p-6">
//         <div className="max-w-3xl mx-auto space-y-6">
//           {/* Responses Section */}
//           {responses.map((res, idx) => (
//             <motion.div
//               key={res.id}
//               initial={{ opacity: 0, y: 10 }}
//               animate={{ opacity: 1, y: 0 }}
//               transition={{ duration: 0.4 }}
//               className="space-y-3"
//             >
//               {/* User Question */}
//               {res.question && (
//                 <div className="self-end max-w-xl ml-auto p-3 rounded-2xl bg-blue-600 text-white shadow-md">
//                   <p className="text-sm font-medium">{res.question}</p>
//                 </div>
//               )}

//               {/* Assistant Response (with typing animation) */}
//               <div className="p-4 bg-white border border-gray-200 rounded-2xl shadow-lg font-serif text-gray-800 leading-relaxed text-base">
//                 <ReactMarkdown remarkPlugins={[remarkGfm]}>
//                   {res.text}
//                 </ReactMarkdown>
//               </div>

//               {/* Query box right after response (only for last one) */}
//               {idx === responses.length - 1 && (
//                 <div className="mt-4 p-4 border border-gray-200 rounded-xl bg-white shadow-sm">
//                   <textarea
//                     rows="3"
//                     className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
//                     value={query}
//                     onChange={(e) => setQuery(e.target.value)}
//                     onKeyDown={(e) =>
//                       e.key === "Enter" && !e.shiftKey && handleAsk()
//                     }
//                     placeholder="Ask another question..."
//                   />
//                   <button
//                     className="mt-3 w-full bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 focus:outline-none flex items-center justify-center"
//                     onClick={handleAsk}
//                     disabled={loadingAsk}
//                   >
//                     {loadingAsk ? "Thinking..." : "Ask LexiCore"}
//                   </button>
//                 </div>
//               )}
//             </motion.div>
//           ))}

//           {/* First Query Section (if no responses yet) */}
//           {responses.length === 0 && (
//             <div className="p-4 border border-gray-200 rounded-xl bg-white shadow-sm">
//               <textarea
//                 rows="3"
//                 className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
//                 value={query}
//                 onChange={(e) => setQuery(e.target.value)}
//                 onKeyDown={(e) =>
//                   e.key === "Enter" && !e.shiftKey && handleAsk()
//                 }
//                 placeholder="Type your legal question here..."
//               />
//               <button
//                 className="mt-3 w-full bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 focus:outline-none flex items-center justify-center"
//                 onClick={handleAsk}
//                 disabled={loadingAsk}
//               >
//                 {loadingAsk ? "Thinking..." : "Ask LexiCore"}
//               </button>
//             </div>
//           )}

//           {/* Upload PDF */}
//           <div className="p-4 border border-gray-200 rounded-xl bg-white shadow-sm">
//             <label className="block mb-2 text-sm font-medium text-gray-700">
//               Upload PDF
//             </label>
//             <div className="flex items-center space-x-3">
//               <input
//                 type="file"
//                 accept="application/pdf"
//                 onChange={handleUpload}
//                 disabled={loadingUpload}
//               />
//               {loadingUpload && (
//                 <span className="text-sm text-gray-500">Uploading...</span>
//               )}
//             </div>
//           </div>

//           {/* Sources */}
//           {sources.length > 0 && (
//             <div>
//               <h3 className="text-sm font-medium text-gray-700 mb-3">
//                 Sources
//               </h3>
//               <div className="space-y-3">
//                 {sources.map((source) => (
//                   <div
//                     key={source.id}
//                     className="flex items-center p-3 border border-gray-200 rounded-md bg-white shadow-sm"
//                   >
//                     <FiFileText className="text-gray-400 mr-3 flex-shrink-0" />
//                     <span className="text-sm text-gray-900 font-medium">
//                       {source.name}
//                     </span>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

// export default Assistant;



// ------------------------------------------------------

import { useState, useEffect } from "react";
import { FiFileText } from "react-icons/fi";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "framer-motion";

const API_BASE =  "http://localhost:8000";

function Assistant() {
  const [activeTab, setActiveTab] = useState("assist");
  const [query, setQuery] = useState("");
  const [sources, setSources] = useState([]);
  const [responses, setResponses] = useState([]);
  const [loadingAsk, setLoadingAsk] = useState(false);
  const [loadingUpload, setLoadingUpload] = useState(false);

  const [task, setTask] = useState("qa"); // qa | summarize | identify_risks | draft_email
  const [prompts, setPrompts] = useState({ shared: {}, private: {} });
  const [promptKey, setPromptKey] = useState("qa_default");
  const [customPrompt, setCustomPrompt] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/api/prompts`)
      .then((r) => r.json())
      .then(setPrompts)
      .catch(() => {});
  }, []);

  // ✅ Multi-file, multi-type upload
  const handleUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append("files", f));

    // optimistic UI for file names
    setSources((prev) => [
      ...prev,
      ...Array.from(files).map((f) => ({ id: Date.now() + f.name, name: f.name })),
    ]);

    try {
      setLoadingUpload(true);
      const res = await fetch(`${API_BASE}/api/upload`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      await res.json();
    } catch (err) {
      setResponses((prev) => [...prev, { id: Date.now(), text: "⚠️ Error uploading file(s)." }]);
    } finally {
      setLoadingUpload(false);
      event.target.value = ""; // reset input
    }
  };

  // ✅ Ask with task + (optional) promptKey/customPrompt
  const handleAsk = async () => {
    if (sources.length === 0) {
      setResponses((prev) => [...prev, { id: Date.now(), text: "⚠️ Please upload a document first!" }]);
      return;
    }
    if (!query.trim()) return;

    setLoadingAsk(true);
    try {
      const payload = {
        question: query,
        task,
        top_k: 6,
        promptKey: customPrompt.trim() ? null : promptKey,
        customPrompt: customPrompt.trim() || null,
      };

      const res = await fetch(`${API_BASE}/api/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      const responseText = data.answer || "⚠️ No response";
      const citations = data.sources || [];

      const newId = Date.now();
      setResponses((prev) => [
        ...prev,
        { id: newId, text: "", fullText: responseText, question: query, citations },
      ]);
      setQuery("");

      // typing animation
      let i = 0;
      const interval = setInterval(() => {
        setResponses((prev) =>
          prev.map((r) => (r.id === newId ? { ...r, text: r.fullText.slice(0, i + 1) } : r))
        );
        i++;
        if (i >= responseText.length) clearInterval(interval);
      }, 18);
    } catch (err) {
      setResponses((prev) => [...prev, { id: Date.now(), text: "⚠️ Error fetching response." }]);
    } finally {
      setLoadingAsk(false);
    }
  };

  const promptOptions = Object.keys(prompts.shared || {});

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50">
      {/* Tabs */}
      <div className="border-b border-gray-200 px-6 bg-white shadow-sm">
        <nav className="flex -mb-px space-x-8">
          <button
            onClick={() => setActiveTab("assist")}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
              activeTab === "assist"
                ? "border-blue-500 text-gray-900"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            Assist
          </button>
          <button
            onClick={() => setActiveTab("draft")}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
              activeTab === "draft"
                ? "border-blue-500 text-gray-900"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            Draft
          </button>
        </nav>
      </div>

      {/* Main */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Controls */}
          <div className="p-4 border border-gray-200 rounded-xl bg-white shadow-sm grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Task */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Task</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={task}
                onChange={(e) => setTask(e.target.value)}
              >
                <option value="qa">Answer Questions</option>
                <option value="summarize">Summarize Document</option>
                <option value="identify_risks">Identify Risks</option>
                <option value="draft_email">Draft Email</option>
              </select>
            </div>

            {/* Prompt picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prompt (library)</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={promptKey}
                onChange={(e) => setPromptKey(e.target.value)}
                disabled={!!customPrompt.trim()}
              >
                {promptOptions.length === 0 ? (
                  <option value="">No prompts</option>
                ) : (
                  promptOptions.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Custom prompt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custom Prompt (overrides library)
              </label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Optional: write a one-off prompt…"
              />
            </div>
          </div>

          {/* Responses */}
          {responses.map((res, idx) => (
            <motion.div
              key={res.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-3"
            >
              {res.question && (
                <div className="self-end max-w-xl ml-auto p-3 rounded-2xl bg-blue-600 text-white shadow-md">
                  <p className="text-sm font-medium">{res.question}</p>
                </div>
              )}

              <div className="p-4 bg-white border border-gray-200 rounded-2xl shadow-lg font-serif text-gray-800 leading-relaxed text-base">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{res.text}</ReactMarkdown>
              </div>

              {/* Citations */}
              {res.citations && res.citations.length > 0 && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                  <div className="font-medium mb-2">Sources</div>
                  <ul className="space-y-1">
                    {res.citations.map((c, i) => (
                      <li key={i} className="text-gray-700">
                        <span className="font-mono">{c.source}</span>
                        {c.page !== null && c.page !== undefined ? `, p.${c.page}` : ""}
                        {c.filetype ? ` (${c.filetype})` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Query box after last */}
              {idx === responses.length - 1 && (
                <div className="mt-4 p-4 border border-gray-200 rounded-xl bg-white shadow-sm">
                  <textarea
                    rows="3"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAsk()}
                    placeholder="Ask another question..."
                  />
                  <button
                    className="mt-3 w-full bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 focus:outline-none flex items-center justify-center"
                    onClick={handleAsk}
                    disabled={loadingAsk}
                  >
                    {loadingAsk ? "Thinking..." : "Ask LexiCore"}
                  </button>
                </div>
              )}
            </motion.div>
          ))}

          {/* First Query */}
          {responses.length === 0 && (
            <div className="p-4 border border-gray-200 rounded-xl bg-white shadow-sm">
              <textarea
                rows="3"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAsk()}
                placeholder="Type your legal question here..."
              />
              <button
                className="mt-3 w-full bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 focus:outline-none flex items-center justify-center"
                onClick={handleAsk}
                disabled={loadingAsk}
              >
                {loadingAsk ? "Thinking..." : "Ask LexiCore"}
              </button>
            </div>
          )}

          {/* Upload */}
          <div className="p-4 border border-gray-200 rounded-xl bg-white shadow-sm">
            <label className="block mb-2 text-sm font-medium text-gray-700">Upload files</label>
            <div className="flex items-center space-x-3">
              <input
                type="file"
                multiple
                accept=".pdf,.docx,.xlsx,.zip"
                onChange={handleUpload}
                disabled={loadingUpload}
              />
              {loadingUpload && <span className="text-sm text-gray-500">Uploading…</span>}
            </div>
          </div>

          {/* Sources (uploaded list) */}
          {sources.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Uploaded</h3>
              <div className="space-y-3">
                {sources.map((source) => (
                  <div key={source.id} className="flex items-center p-3 border border-gray-200 rounded-md bg-white shadow-sm">
                    <FiFileText className="text-gray-400 mr-3 flex-shrink-0" />
                    <span className="text-sm text-gray-900 font-medium">{source.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default Assistant;
