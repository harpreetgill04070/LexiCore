// import { useState } from "react";
// import { FiMessageSquare, FiFolder, FiGrid } from "react-icons/fi";
// import Assistant from "./components/Assistant";
// import Vault from "./components/Vault";
// import Workflows from "./components/Workflows";

// function App() {
//   const [activeComponent, setActiveComponent] = useState("assistant");

//   const navItems = [
//     { id: "assistant", icon: <FiMessageSquare className="mr-3" />, label: "Assistant" },
//     { id: "vault", icon: <FiFolder className="mr-3" />, label: "Vault" },
//     { id: "workflows", icon: <FiGrid className="mr-3" />, label: "Workflows" },
//   ];

//   return (
//     <div className="flex h-screen bg-white text-gray-900">
//       {/* Sidebar */}
//       <div className="w-64 border-r border-gray-200 p-6">
//         <h1 className="text-2xl font-serif font-bold mb-10">LexiCore</h1>
//         <nav className="space-y-1">
//           {navItems.map((item) => (
//             <button
//               key={item.id}
//               onClick={() => setActiveComponent(item.id)}
//               className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
//                 activeComponent === item.id
//                   ? 'bg-blue-50 text-blue-700'
//                   : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
//               }`}
//             >
//               {item.icon}
//               {item.label}
//             </button>
//           ))}
//         </nav>
//       </div>
      
//       {/* Main Content */}
//       <div className="flex-1 overflow-hidden">
//         {activeComponent === "assistant" && <Assistant />}
//         {activeComponent === "vault" && <Vault />}
//         {activeComponent === "workflows" && <Workflows />}
//       </div>
//     </div>
//   );
// }

// export default App;



import { useState } from "react";
import { FiMessageSquare, FiFolder, FiGrid } from "react-icons/fi";
import Assistant from "./components/Assistant";
import Vault from "./components/Vault";
import Workflows from "./components/Workflows";

function App() {
  const [activeComponent, setActiveComponent] = useState("assistant");

  // ✅ Shared state
  const [sources, setSources] = useState([]);
  const [responses, setResponses] = useState([]);

  const navItems = [
    { id: "assistant", icon: <FiMessageSquare className="mr-3" />, label: "Assistant" },
    { id: "vault", icon: <FiFolder className="mr-3" />, label: "Vault" },
    { id: "workflows", icon: <FiGrid className="mr-3" />, label: "Workflows" },
  ];

  return (
    <div className="flex h-screen bg-white text-gray-900">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-200 p-6">
        <h1 className="text-2xl font-serif font-bold mb-10">Ross AI</h1>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveComponent(item.id)}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                activeComponent === item.id
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {activeComponent === "assistant" && (
          <Assistant
            sources={sources}
            setSources={setSources}
            responses={responses}
            setResponses={setResponses}
          />
        )}
        {activeComponent === "vault" && <Vault sources={sources} responses={responses} />}
        {activeComponent === "workflows" && <Workflows />}
      </div>
    </div>
  );
}

export default App;
