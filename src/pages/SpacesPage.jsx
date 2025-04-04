import { useEffect, useState } from "react";
import { 
  auth, 
  db, 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  arrayUnion, 
  increment, 
  addDoc, 
  getDoc,
  query,
  where,
  runTransaction,
  deleteDoc,
  onSnapshot
} from "../firebaseConfig";
import Sidebar from "../components/Sidebar";
import { useNavigate } from "react-router-dom";

function SpacesPage() {
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [spaceToDelete, setSpaceToDelete] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [showDescription, setShowDescription] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newSpace, setNewSpace] = useState({
    spaceName: "",
    description: ""
  });
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    let unsubscribe;

    const fetchUserName = async (email) => {
      try {
        if (!email) {
          console.error("No email provided to fetchUserName");
          return "Unknown User";
        }

        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          console.error(`No user found with email: ${email}`);
          return "Unknown User";
        }

        const userData = querySnapshot.docs[0].data();
        if (!userData.firstName && !userData.lastName) {
          console.error(`User found but missing name data for email: ${email}`);
          return "Unknown User";
        }

        return `${userData.firstName} ${userData.lastName}`.trim();
      } catch (error) {
        console.error("Error fetching username:", error);
        // More detailed error handling
        if (error.code === 'permission-denied') {
          return "Access Denied";
        }
        if (error.code === 'not-found') {
          return "User Not Found";
        }
        return "Error Loading User";
      }
    };

    const setupSpacesListener = () => {
      try {
        const spacesCollection = collection(db, "spaces");
        
        // Set up real-time listener
        unsubscribe = onSnapshot(spacesCollection, async (snapshot) => {
          if (!isMounted) return;

          const spacesList = await Promise.all(
            snapshot.docs.map(async (doc) => {
              const data = doc.data();
              const creatorEmail = data.createdBy;
              const creatorUsername = await fetchUserName(creatorEmail);
              
              return {
                id: doc.id,
                spaceName: data.spaceName,
                description: data.description,
                createdBy: creatorEmail,
                creatorUsername,
                members: Array.isArray(data.members) ? data.members.filter(m => m !== "[]") : [],
                numMembers: data.numMembers || 0,
                createdAt: data.createdAt ? new Date(data.createdAt) : null
              };
            })
          );

          setSpaces(spacesList);
          setLoading(false);
          setError(null);
        }, (error) => {
          console.error("Error listening to spaces:", error);
          if (isMounted) {
            if (error.code === 'permission-denied') {
              setError("You don't have permission to view spaces.");
            } else {
              setError("Failed to load spaces. Please try again later.");
            }
            setLoading(false);
          }
        });

      } catch (error) {
        console.error("Error setting up spaces listener:", error);
        if (isMounted) {
          setError("Failed to load spaces. Please try again.");
          setLoading(false);
        }
      }
    };

    setupSpacesListener();

    // Cleanup function
    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []); // Empty dependency array since we want this to run once on mount

  // Add useEffect for handling temporary error display
  useEffect(() => {
    if (formError) {
      const timer = setTimeout(() => {
        setFormError(null);
      }, 3000); // Hide after 3 seconds

      return () => clearTimeout(timer);
    }
  }, [formError]);

  // Add useEffect for handling temporary delete error display
  useEffect(() => {
    if (deleteError) {
      const timer = setTimeout(() => {
        setDeleteError(null);
      }, 3000); // Hide after 3 seconds

      return () => clearTimeout(timer);
    }
  }, [deleteError]);

  const handleJoinSpace = async (spaceId) => {
    try {
      const userEmail = auth.currentUser?.email;
      if (!userEmail) {
        throw new Error("User not authenticated");
      }

      // Use a transaction to handle the join operation
      await runTransaction(db, async (transaction) => {
        const spaceRef = doc(db, "spaces", spaceId);
        const spaceDoc = await transaction.get(spaceRef);

        if (!spaceDoc.exists()) {
          throw new Error("Space not found");
        }

        const spaceData = spaceDoc.data();
        const members = Array.isArray(spaceData.members) ? spaceData.members : [];

        if (members.includes(userEmail)) {
          // If user is already a member, just navigate to chat
          return;
        }

        // Update the space document atomically
        transaction.update(spaceRef, {
          members: arrayUnion(userEmail),
          numMembers: increment(1)
        });
      });

      // Update local state after successful transaction
      setSpaces(prevSpaces => 
        prevSpaces.map(space => {
          if (space.id === spaceId) {
            return {
              ...space,
              members: [...space.members, userEmail],
              numMembers: (space.numMembers || 0) + 1
            };
          }
          return space;
        })
      );

      navigate(`/chat/${spaceId}`);
    } catch (error) {
      console.error("Error joining space:", error);
      // More descriptive error messages
      if (error.message === "User not authenticated") {
        setError("Please log in to join spaces.");
      } else if (error.message === "Space not found") {
        setError("This space no longer exists.");
      } else if (error.code === 'permission-denied') {
        setError("You don't have permission to join this space.");
      } else {
        setError("Failed to join space. Please try again.");
      }
    }
  };

  const handleCreateSpace = async (e) => {
    e.preventDefault();
    try {
      const userEmail = auth.currentUser?.email;
      if (!userEmail) {
        throw new Error("User not authenticated");
      }

      // Check if a space with the same name already exists
      const spacesCollection = collection(db, "spaces");
      const q = query(spacesCollection, where("spaceName", "==", newSpace.spaceName));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        setFormError("A space with this name already exists");
        return;
      }

      // Get current user's full name using optimized query
      const usersRef = collection(db, "users");
      const userQuery = query(usersRef, where("email", "==", userEmail));
      const userQuerySnapshot = await getDocs(userQuery);
      
      if (userQuerySnapshot.empty) {
        throw new Error("User profile not found");
      }

      const userData = userQuerySnapshot.docs[0].data();
      const username = `${userData.firstName} ${userData.lastName}`.trim();

      const newSpaceData = {
        spaceName: newSpace.spaceName,
        description: newSpace.description,
        createdBy: userEmail,
        members: [userEmail],
        numMembers: 1,
        createdAt: new Date().toISOString()
      };

      await addDoc(spacesCollection, newSpaceData);
      
      // Reset form and close modal
      setNewSpace({ spaceName: "", description: "" });
      setShowModal(false);
      setFormError(null);
    } catch (error) {
      console.error("Error creating space:", error);
      // More descriptive error messages
      if (error.message === "User not authenticated") {
        setFormError("Please log in to create spaces.");
      } else if (error.message === "User profile not found") {
        setFormError("Unable to find your user profile. Please try logging in again.");
      } else if (error.code === 'permission-denied') {
        setFormError("You don't have permission to create spaces.");
      } else {
        setFormError("Failed to create space. Please try again.");
      }
    }
  };

  const handleDeleteSpace = async () => {
    if (!spaceToDelete) return;

    try {
      const userEmail = auth.currentUser?.email;
      if (!userEmail) {
        throw new Error("User not authenticated");
      }

      // Check if user is the creator
      if (spaceToDelete.createdBy !== userEmail) {
        setDeleteError("You can only delete spaces you've created.");
        setShowDeleteModal(false);
        setSpaceToDelete(null);
        return;
      }

      // Delete space and its messages
      const spaceRef = doc(db, "spaces", spaceToDelete.id);
      const messagesRef = collection(db, `spaces/${spaceToDelete.id}/messages`);

      // Get all messages
      const messagesSnapshot = await getDocs(messagesRef);

      // Use a transaction to ensure all deletes succeed or none do
      await runTransaction(db, async (transaction) => {
        // Delete all messages
        messagesSnapshot.docs.forEach(doc => {
          transaction.delete(doc.ref);
        });

        // Delete the space itself
        transaction.delete(spaceRef);
      });

      // Close modals
      setShowDeleteModal(false);
      setSpaceToDelete(null);
      setDropdownOpen(null);
      
      // Show success message
      setError(null);
    } catch (error) {
      console.error("Error deleting space:", error);
      setError("Failed to delete space. Please try again.");
    }
  };

  // Add filterSpaces function
  const filterSpaces = (spaces, query) => {
    if (!query) return spaces;
    const lowerQuery = query.toLowerCase();
    return spaces.filter(space => 
      space.spaceName.toLowerCase().includes(lowerQuery)
    );
  };

  const renderSpaceCard = (space) => {
    const isMember = space.members?.includes(auth.currentUser?.email);
    const isCreator = space.createdBy === auth.currentUser?.email;

    return (
      <div 
        key={space.id} 
        className="bg-[#3A3344] p-6 rounded-lg shadow-md text-white relative cursor-pointer"
        onClick={() => {
          setSelectedSpace(space);
          setShowDescription(true);
        }}
      >
        {/* Show dropdown menu only for spaces in "More Spaces" section and if user is creator */}
        {space.createdAt && (
          <div className="absolute top-4 right-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDropdownOpen(dropdownOpen === space.id ? null : space.id);
              }}
              className="text-gray-400 hover:text-white focus:outline-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
            
            {dropdownOpen === space.id && (
              <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-[#2C2638] ring-1 ring-black ring-opacity-5 z-10">
                <div className="py-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isCreator) {
                        setSpaceToDelete(space);
                        setShowDeleteModal(true);
                      } else {
                        setDeleteError("You can only delete spaces you've created.");
                      }
                      setDropdownOpen(null);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-[#3A3344]"
                  >
                    Delete Space
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <h3 className="text-xl font-semibold mb-2">
          {space.spaceName || 'Unnamed Space'}
        </h3>
        <div className="text-gray-300 mb-4 space-y-2">
          <p className="text-sm">
            <span className="text-gray-400">Created by</span> {space.createdAt ? space.creatorUsername : space.createdBy}
          </p>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">
            {space.numMembers || 0} members
          </span>
          <button 
            className="px-4 py-2 rounded-lg transition duration-200 text-white min-w-[100px] text-center"
            style={{
              backgroundColor: "#6E5BA6",
              cursor: "pointer"
            }}
            onClick={() => isMember ? navigate(`/chat/${space.id}`) : handleJoinSpace(space.id)}
          >
            {isMember ? "Open" : "Join Space"}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#2C2638] flex">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto h-screen bg-[#2C2638]">
        {/* Search Bar */}
        <div className="mb-8">
          <form className="relative max-w-2xl mx-auto" onSubmit={(e) => e.preventDefault()}>
            <button className="absolute left-2 -translate-y-1/2 top-1/2 p-1">
              <svg
                width="17"
                height="16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                role="img"
                aria-labelledby="search"
                className="w-5 h-5 text-gray-400"
              >
                <path
                  d="M7.667 12.667A5.333 5.333 0 107.667 2a5.333 5.333 0 000 10.667zM14.334 14l-2.9-2.9"
                  stroke="currentColor"
                  strokeWidth="1.333"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></path>
              </svg>
            </button>
            <input
              className="w-full rounded-full px-8 py-3 bg-[#3A3344] border-2 border-transparent focus:outline-none focus:border-[#6E5BA6] text-white placeholder-gray-400 transition-all duration-300 shadow-md"
              placeholder="Search spaces..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                type="button" 
                onClick={() => setSearchQuery("")}
                className="absolute right-3 -translate-y-1/2 top-1/2 p-1"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 text-gray-400 hover:text-white transition-colors duration-200"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  ></path>
                </svg>
              </button>
            )}
          </form>
        </div>

        {loading ? (
          <div className="bg-[#3A3344] p-6 rounded-lg shadow-md text-white">
            <p>Loading spaces...</p>
          </div>
        ) : error && !showModal ? (
          <div className="bg-red-500 p-6 rounded-lg shadow-md text-white flex justify-between">
            <p>{error}</p>
            <button 
              className="bg-white text-red-500 px-4 py-1 rounded hover:bg-gray-200"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="space-y-8 pb-20">
            {/* My Spaces section */}
            <div>
              <h2 className="text-2xl font-semibold mb-6 text-white">My Spaces</h2>
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {(() => {
                  const filteredSpaces = filterSpaces(
                    spaces.filter(space => space.members?.includes(auth.currentUser?.email)),
                    searchQuery
                  ).sort((a, b) => b.createdAt - a.createdAt);

                  return filteredSpaces.length > 0 ? (
                    filteredSpaces.map(renderSpaceCard)
                  ) : (
                    <div className="col-span-full text-center py-8">
                      <p className="text-gray-400">
                        {searchQuery ? "No spaces found matching your search" : "You haven't joined any spaces yet"}
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Delete Error Message */}
            {deleteError && (
              <p className="text-red-400 text-sm text-center my-4">
                {deleteError}
              </p>
            )}

            {/* Explore Spaces section */}
            <div>
              <h2 className="text-2xl font-semibold mb-6 text-white">Explore Spaces</h2>
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {(() => {
                  const filteredSpaces = filterSpaces(
                    spaces.filter(space => !space.members?.includes(auth.currentUser?.email)),
                    searchQuery
                  ).sort((a, b) => b.createdAt - a.createdAt);

                  return filteredSpaces.length > 0 ? (
                    filteredSpaces.map(renderSpaceCard)
                  ) : (
                    <div className="col-span-full text-center py-8">
                      <p className="text-gray-400">
                        {searchQuery ? "No spaces found matching your search" : "No spaces available to join"}
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Create Space Button - Fixed position */}
        <button
          onClick={() => setShowModal(true)}
          className="fixed bottom-8 right-8 bg-[#6E5BA6] text-white p-4 rounded-full shadow-lg hover:bg-[#5D4A8F] transition-colors duration-200 flex items-center justify-center z-10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && spaceToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-[#3A3344] rounded-lg p-6 w-full max-w-md">
              <h3 className="text-xl font-semibold mb-4 text-white">Delete Space</h3>
              <p className="text-gray-300 mb-6">
                Are you sure you want to delete "{spaceToDelete.spaceName}"? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSpaceToDelete(null);
                  }}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteSpace}
                  className="px-4 py-2 bg-[#6E5BA6] text-white rounded-md hover:bg-[#5D4A8F] transition-colors duration-200"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Space Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-[#3A3344] rounded-lg p-6 w-full max-w-md">
              <h3 className="text-xl font-semibold mb-4 text-white">Create New Space</h3>
              <form onSubmit={handleCreateSpace} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Space Name
                  </label>
                  <input
                    type="text"
                    value={newSpace.spaceName}
                    onChange={(e) => {
                      setNewSpace(prev => ({ ...prev, spaceName: e.target.value }));
                      if (formError) {
                        setFormError(null);
                      }
                    }}
                    className="w-full px-3 py-2 bg-[#2C2638] border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#6E5BA6]"
                    required
                  />
                  {formError && (
                    <p className="mt-2 text-sm text-red-400">{formError}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newSpace.description}
                    onChange={(e) => setNewSpace(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#2C2638] border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#6E5BA6]"
                    rows="3"
                    placeholder="Describe what this space is about..."
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-gray-300 hover:text-white transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#6E5BA6] text-white rounded-md hover:bg-[#5D4A8F] transition-colors duration-200"
                  >
                    Create Space
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Description Popup */}
        {showDescription && selectedSpace && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-[#3A3344] rounded-lg p-6 w-full max-w-md">
              <h3 className="text-xl font-semibold mb-4 text-white">{selectedSpace.spaceName}</h3>
              <p className="text-gray-300 mb-6 whitespace-pre-wrap">
                {selectedSpace.description || "No description provided."}
              </p>
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowDescription(false);
                    setSelectedSpace(null);
                  }}
                  className="px-4 py-2 bg-[#6E5BA6] text-white rounded-md hover:bg-[#5D4A8F] transition-colors duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default SpacesPage;
