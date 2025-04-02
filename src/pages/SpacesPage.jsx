import { useEffect, useState } from "react";
import { auth, db, collection, getDocs, doc, updateDoc, arrayUnion, increment } from "../firebaseConfig";
import Sidebar from "../components/Sidebar";
import { useNavigate } from "react-router-dom";

function SpacesPage() {
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const fetchSpaces = async () => {
      try {
        const spacesCollection = collection(db, "spaces");
        const spacesSnapshot = await getDocs(spacesCollection);
        
        if (!isMounted) return;

        const spacesList = spacesSnapshot.docs.map(doc => {
          const data = doc.data();
          // Clean up the data structure
          const cleanedData = {
            id: doc.id,
            spaceName: data.spaceName,
            createdBy: data[" createdBy"] || data.createdBy, // Handle both cases
            members: Array.isArray(data.members) ? data.members.filter(m => m !== "[]") : [],
            numMembers: data.numMembers || data["numMembers "] || 0
          };
          
          console.log(`Space ${doc.id} cleaned data:`, cleanedData);
          return cleanedData;
        });

        console.log("Final spaces list:", JSON.stringify(spacesList, null, 2));
        setSpaces(spacesList);
        setError(null);
      } catch (error) {
        console.error("Error fetching spaces:", error);
        if (isMounted) {
          setError("Failed to load spaces. Please try again later.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSpaces();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleJoinSpace = async (spaceId) => {
    try {
      const userEmail = auth.currentUser?.email;
      if (!userEmail) {
        throw new Error("User not authenticated");
      }

      const spaceRef = doc(db, "spaces", spaceId);
      await updateDoc(spaceRef, {
        members: arrayUnion(userEmail),
        numMembers: increment(1)
      });

      navigate(`/chat/${spaceId}`);
    } catch (error) {
      console.error("Error joining space:", error);
      setError("Failed to join space. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[#2C2638]">
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 p-8">
          <h2 className="text-2xl font-semibold mb-6 text-white">Spaces for you</h2>
          
          {loading ? (
            <div className="bg-[#3A3344] p-6 rounded-lg shadow-md text-white">
              <p>Loading spaces...</p>
            </div>
          ) : error ? (
            <div className="bg-red-500 p-6 rounded-lg shadow-md text-white flex justify-between">
              <p>{error}</p>
              <button 
                className="bg-white text-red-500 px-4 py-1 rounded hover:bg-gray-200"
                onClick={() => window.location.reload()}
              >
                Retry
              </button>
            </div>
          ) : spaces.length > 0 ? (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {spaces.map(space => {
                const isMember = space.members?.includes(auth.currentUser?.email);

                return (
                  <div key={space.id} className="bg-[#3A3344] p-6 rounded-lg shadow-md text-white">
                    <h3 className="text-xl font-semibold mb-2">
                      {space.spaceName || 'Unnamed Space'}
                    </h3>
                    <div className="text-gray-300 mb-4 space-y-2">
                      <p className="text-sm">
                        <span className="text-gray-400">Created by</span> {space.createdBy || 'Unknown'}
                      </p>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">
                        {space.numMembers || 0} members
                      </span>
                      <button 
                        className="px-4 py-2 rounded-lg transition duration-200 text-white"
                        style={{
                          backgroundColor: "#6E5BA6",
                          cursor: "pointer"
                        }}
                        onClick={() => isMember ? navigate(`/chat/${space.id}`) : handleJoinSpace(space.id)}
                      >
                        {isMember ? "Joined" : "Join Space"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-[#3A3344] p-6 rounded-lg shadow-md text-white">
              <p>No spaces available.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default SpacesPage;
