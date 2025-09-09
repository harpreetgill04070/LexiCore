
import { useState, useEffect } from "react";
import { FiFileText, FiSend, FiUploadCloud, FiUser, FiCpu } from "react-icons/fi";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "framer-motion";

const API_BASE = "https://lexicore.onrender.com";

function Assistant({ sources, setSources, responses, setResponses }) {
  const [query, setQuery] = useState("");
  const [loadingAsk, setLoadingAsk] = useState(false);
  const [loadingUpload, setLoadingUpload] = useState(false);

  const [task, setTask] = useState("qa");
  const [prompts, setPrompts] = useState({ shared: {}, private: {} });
  const [promptKey, setPromptKey] = useState("qa_default");
  const [customPrompt, setCustomPrompt] = useState("");
  const [model, setModel] = useState("gpt-4o-mini");

  useEffect(() => {
    fetch(`${API_BASE}/api/prompts`)
      .then((r) => r.json())
      .then(setPrompts)
      .catch(() => {});
  }, []);

  // Upload files
  const uploadFiles = async (files) => {
    if (!files || files.length === 0) return;
    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append("files", f));

    setSources((prev) => [
      ...prev,
      ...Array.from(files).map((f) => ({ id: Date.now() + f.name, name: f.name })),
    ]);

    try {
      setLoadingUpload(true);
      const res = await fetch(`${API_BASE}/api/upload`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      await res.json();
    } catch {
      setResponses((prev) => [...prev, { id: Date.now(), text: "⚠️ Error uploading file(s)." }]);
    } finally {
      setLoadingUpload(false);
    }
  };

  const handleUpload = (event) => {
    uploadFiles(event.target.files);
    event.target.value = ""; // reset input
  };

  // Ask endpoint
  const handleAsk = async () => {
    if (!query.trim()) return;

    setLoadingAsk(true);
    try {
      const payload = {
        question: query,
        task,
        top_k: 6,
        model,
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

      // typing effect
      let i = 0;
      const interval = setInterval(() => {
        setResponses((prev) =>
          prev.map((r) => (r.id === newId ? { ...r, text: r.fullText.slice(0, i + 1) } : r))
        );
        i++;
        if (i >= responseText.length) clearInterval(interval);
      }, 18);
    } catch {
      setResponses((prev) => [...prev, { id: Date.now(), text: "⚠️ Error fetching response." }]);
    } finally {
      setLoadingAsk(false);
    }
  };

  const promptOptions = Object.keys(prompts.shared || {});

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Controls */}
      <div className="border-b bg-white shadow-sm px-6 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <select
            className="px-3 py-2 border rounded-lg text-sm"
            value={task}
            onChange={(e) => setTask(e.target.value)}
          >
            <option value="qa">Answer Questions</option>
            <option value="summarize">Summarize</option>
            <option value="identify_risks">Identify Risks</option>
            <option value="draft_email">Draft Email</option>
          </select>
          <select
            className="px-3 py-2 border rounded-lg text-sm"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          >
            <option value="gpt-4o-mini">GPT-4o Mini</option>
            <option value="gpt-4">GPT-4</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
          </select>
          <select
            className="px-3 py-2 border rounded-lg text-sm"
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
          <input
            className="px-3 py-2 border rounded-lg text-sm"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Custom prompt..."
          />
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {responses.map((res) => (
          <motion.div
            key={res.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-3"
          >
            {/* User bubble */}
            {res.question && (
              <div className="flex justify-end">
                <div className="flex items-start space-x-2 max-w-xl">
                  <div className="p-3 rounded-2xl bg-blue-600 text-white shadow-md">
                    <p className="text-sm">{res.question}</p>
                  </div>
                  <FiUser className="text-gray-400 mt-1" />
                </div>
              </div>
            )}

            {/* AI bubble */}
            <div className="flex items-start space-x-2 max-w-2xl">
              <FiCpu className="text-blue-500 mt-1" />
              <div className="p-4 bg-white border rounded-2xl shadow-md text-gray-800 leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{res.text}</ReactMarkdown>
              </div>
            </div>

            {/* Sources */}
            {res.citations && res.citations.length > 0 && (
              <div className="ml-7 p-3 bg-gray-100 border rounded-lg text-xs">
                <p className="font-medium mb-1">Sources:</p>
                <ul className="space-y-1">
                  {res.citations.map((c, i) => (
                    <li key={i}>
                      <span className="font-mono">{c.source}</span>
                      {c.page ? `, p.${c.page}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        ))}

        {/* Upload section */}
        <div className="p-6 border-2 border-dashed border-gray-300 rounded-xl bg-white shadow-sm text-center hover:border-blue-400 hover:bg-blue-50 transition">
          <FiUploadCloud className="text-3xl mx-auto mb-2 text-blue-500" />
          <p className="text-sm text-gray-600">Drag & drop files here or click below</p>
          <input
            type="file"
            multiple
            accept=".pdf,.docx,.xlsx,.zip"
            onChange={handleUpload}
            disabled={loadingUpload}
            id="fileInput"
            className="hidden"
          />
          <label
            htmlFor="fileInput"
            className="mt-3 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 cursor-pointer"
          >
            Choose Files
          </label>
          {loadingUpload && <p className="mt-2 text-sm text-gray-500">Uploading…</p>}
        </div>

        {/* Uploaded files */}
        {sources.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Uploaded Files</h3>
            <div className="flex flex-wrap gap-2">
              {sources.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-50 text-blue-700 border border-blue-200"
                >
                  <FiFileText className="mr-1" /> {s.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t bg-white p-4">
        <div className="max-w-3xl mx-auto flex items-center">
          <input
            type="text"
            className="flex-1 px-4 py-3 border rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAsk()}
            placeholder="Ask your question..."
          />
          <button
            onClick={handleAsk}
            disabled={loadingAsk}
            className="ml-3 bg-blue-600 text-white px-5 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            <FiSend className="mr-2" />
            {loadingAsk ? "Thinking…" : "Ross Ai"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Assistant;
