import { useEffect, useState } from "react";
import { FiFileText, FiTrash2 } from "react-icons/fi";

const API_BASE = "http://localhost:8000";

function Vault() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [citations, setCitations] = useState([]);

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
      const res = await fetch(`${API_BASE}/api/files/${filename}`, { method: "DELETE" });
      const data = await res.json();
      if (data.status === "success") {
        setFiles((prev) => prev.filter((f) => f !== filename));
        if (selectedFile === filename) {
          setSelectedFile(null);
          setAnswer("");
          setCitations([]);
        }
      }
    } catch (_) {}
  };

  const handleAsk = async () => {
    if (!selectedFile) {
      setAnswer("⚠️ Please select a file first!");
      setCitations([]);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query, task: "qa", file: selectedFile, top_k: 6 }),
      });
      const data = await res.json();
      setAnswer(data.answer || "⚠️ No response.");
      setCitations(data.sources || []);
    } catch (err) {
      setAnswer("⚠️ Error fetching response.");
      setCitations([]);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 p-6">
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
                selectedFile === file ? "border-blue-500" : "border-gray-200"
              }`}
              onClick={() => setSelectedFile(file)}
            >
              <div className="flex items-center">
                <FiFileText className="text-gray-400 mr-3" />
                <span className="text-sm font-medium text-gray-900">{file}</span>
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
          {files.length === 0 && <p className="text-sm text-gray-500">No files uploaded yet.</p>}
        </div>
      )}

      {/* Query Box */}
      {selectedFile && (
        <div className="mt-6 p-4 border border-gray-200 rounded-xl bg-white shadow-sm">
          <textarea
            rows="3"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Ask about ${selectedFile}...`}
          />
          <button
            className="mt-3 w-full bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 focus:outline-none"
            onClick={handleAsk}
          >
            Ask Vault
          </button>
        </div>
      )}

      {/* Answer + citations */}
      {answer && (
        <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
          <div className="text-gray-800 whitespace-pre-wrap">{answer}</div>
          {citations.length > 0 && (
            <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm">
              <div className="font-medium mb-2">Sources</div>
              <ul className="space-y-1">
                {citations.map((c, i) => (
                  <li key={i} className="text-gray-700">
                    <span className="font-mono">{c.source}</span>
                    {c.page !== null && c.page !== undefined ? `, p.${c.page}` : ""}
                    {c.filetype ? ` (${c.filetype})` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Vault;
