import { useEffect, useState } from "react";
import { FiFileText, FiTrash2 } from "react-icons/fi";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const API_BASE = "http://localhost:8000";

function Vault() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [query, setQuery] = useState("");
  const [responses, setResponses] = useState([]);
  const [citations, setCitations] = useState([]);
  const [asking, setAsking] = useState(false);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/files`);
      const data = await res.json();
      if (data.status === "success") setFiles(data.files);
    } catch (_) {}
    setLoading(false);
  };

  const deleteFile = async (filename) => {
    try {
      const res = await fetch(`${API_BASE}/api/files/${filename}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.status === "success") {
        setFiles((prev) => prev.filter((f) => f !== filename));
        if (selectedFile === filename) {
          setSelectedFile(null);
          setResponses([]);
          setCitations([]);
        }
      }
    } catch (_) {}
  };

  const handleAsk = async () => {
    if (!selectedFile) {
      setResponses((prev) => [
        ...prev,
        { id: Date.now(), text: "⚠️ Please select a file first!" },
      ]);
      setCitations([]);
      return;
    }
    if (!query.trim()) return;

    setAsking(true);
    try {
      const res = await fetch(`${API_BASE}/api/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: query,
          task: "qa",
          file: selectedFile,
          top_k: 6,
        }),
      });
      const data = await res.json();
      const responseText = data.answer || "⚠️ No response.";
      const sources = data.sources || [];

      const newId = Date.now();
      setResponses((prev) => [
        ...prev,
        {
          id: newId,
          text: "",
          fullText: responseText,
          question: query,
          citations: sources,
        },
      ]);
      setQuery("");

      // typing animation
      let i = 0;
      const interval = setInterval(() => {
        setResponses((prev) =>
          prev.map((r) =>
            r.id === newId ? { ...r, text: r.fullText.slice(0, i + 1) } : r
          )
        );
        i++;
        if (i >= responseText.length) clearInterval(interval);
      }, 18);
    } catch (err) {
      setResponses((prev) => [
        ...prev,
        { id: Date.now(), text: "⚠️ Error fetching response." },
      ]);
      setCitations([]);
    } finally {
      setAsking(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 p-6 font-sans">
      <h2 className="text-lg font-semibold mb-4">📂 Vault</h2>

      {/* File List */}
      {loading ? (
        <p>Loading files...</p>
      ) : (
        <div className="space-y-3">
          {files.map((file, idx) => (
            <div
              key={idx}
              className={`flex items-center justify-between p-3 border rounded-md bg-white shadow-sm cursor-pointer ${
                selectedFile === file
                  ? "border-blue-500 shadow-md"
                  : "border-gray-200"
              }`}
              onClick={() => setSelectedFile(file)}
            >
              <div className="flex items-center">
                <FiFileText className="text-gray-400 mr-3" />
                <span className="text-sm font-medium text-gray-900">
                  {file}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteFile(file);
                }}
                className="text-red-500 hover:text-red-700"
                title="Delete file"
              >
                <FiTrash2 />
              </button>
            </div>
          ))}
          {files.length === 0 && (
            <p className="text-sm text-gray-500">No files uploaded yet.</p>
          )}
        </div>
      )}

      {/* Query Box */}
      {selectedFile && (
        <div className="mt-6 p-4 border border-gray-200 rounded-xl bg-white shadow-lg transition hover:shadow-xl">
          <textarea
            rows="3"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-inner focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Ask about ${selectedFile}...`}
          />
          <button
            className={`mt-3 w-full flex items-center justify-center gap-2 ${
              asking
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-gray-900 hover:bg-gray-800"
            } text-white px-4 py-2 rounded-lg text-sm font-medium focus:outline-none`}
            onClick={handleAsk}
            disabled={asking}
          >
            {asking ? (
              <>
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                Thinking...
              </>
            ) : (
              "Ask Vault"
            )}
          </button>
        </div>
      )}

      {/* Responses */}
      <div className="mt-6 space-y-6 max-h-96 overflow-y-auto pr-2">
        {responses.map((res) => (
          <motion.div
            key={res.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-3"
          >
            {/* Question bubble */}
            {res.question && (
              <div className="self-end max-w-xl ml-auto p-3 rounded-2xl bg-blue-600 text-white shadow-md">
                <p className="text-sm font-medium">{res.question}</p>
              </div>
            )}

            {/* Answer bubble */}
            <div className="p-4 bg-white border border-gray-200 rounded-2xl shadow-lg font-serif text-gray-800 leading-relaxed text-base">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {res.text}
              </ReactMarkdown>
            </div>

            {/* Citations */}
            {res.citations && res.citations.length > 0 && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                <div className="font-medium mb-2">Sources</div>
                <ul className="space-y-1">
                  {res.citations.map((c, i) => (
                    <li key={i} className="text-gray-700">
                      <span className="font-mono">{c.source}</span>
                      {c.page !== null && c.page !== undefined
                        ? `, p.${c.page}`
                        : ""}
                      {c.filetype ? ` (${c.filetype})` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default Vault;
