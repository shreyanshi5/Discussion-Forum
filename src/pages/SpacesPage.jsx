import { useEffect, useState } from "react";
import { auth, db, doc, getDoc } from "../firebaseConfig";
import Sidebar from "../components/Sidebar";

function SpacesPage() {
  return (
    <div className="min-h-screen bg-[#2C2638]">
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 p-8">
          <h2 className="text-2xl font-semibold mb-6 text-white">Spaces</h2>
          <div className="bg-[#3A3344] p-6 rounded-lg shadow-md text-white">
            <p>List of joined spaces and search functionality.</p>
          </div>
        </main>
      </div>
    </div>
  );
}

export default SpacesPage;
  