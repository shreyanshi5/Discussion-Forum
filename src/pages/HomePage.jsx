import { useEffect, useState } from "react";
import { 
  auth, 
  db, 
  doc, 
  getDoc, 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  updateDoc,
  getDocs,
  arrayUnion,
  arrayRemove,
  where
} from "../firebaseConfig";
import Sidebar from "../components/Sidebar";

function Home() {
  const [recentMessages, setRecentMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userCache, setUserCache] = useState({});

  useEffect(() => {
    let unsubscribes = [];
    console.log("Starting to fetch messages...");

    const fetchRecentMessages = async () => {
      if (!auth.currentUser?.email) {
        setLoading(false);
        setError("Please log in to view messages");
        return;
      }

      try {
        // Query spaces where user is a member
        const spacesRef = collection(db, "spaces");
        const spacesQuery = query(
          spacesRef,
          where("members", "array-contains", auth.currentUser.email)
        );

        const spacesSnapshot = await getDocs(spacesQuery);
        console.log("Found spaces:", spacesSnapshot.size);

        if (spacesSnapshot.empty) {
          setLoading(false);
          return;
        }

        // Set up listeners for each space's messages
        spacesSnapshot.docs.forEach(spaceDoc => {
          const spaceData = spaceDoc.data();
          const messagesRef = collection(db, "spaces", spaceDoc.id, "messages");
          const messagesQuery = query(
            messagesRef,
            orderBy("timestamp", "desc"),
            limit(15)
          );

          const unsubscribe = onSnapshot(messagesQuery, async (snapshot) => {
            try {
              const messages = await Promise.all(snapshot.docs.map(async (messageDoc) => {
                const messageData = messageDoc.data();
                
                // Use cached user data if available
                let userData = userCache[messageData.senderId];
                if (!userData) {
                  const userRef = doc(db, "users", messageData.senderId);
                  const userSnap = await getDoc(userRef);
                  userData = userSnap.exists() ? userSnap.data() : null;
                  
                  if (userData) {
                    setUserCache(prev => ({
                      ...prev,
                      [messageData.senderId]: userData
                    }));
                  }
                }
                
                return {
                  id: messageDoc.id,
                  spaceId: spaceDoc.id,
                  spaceName: spaceData.spaceName,
                  message: messageData.message,
                  timestamp: messageData.timestamp,
                  senderId: messageData.senderId,
                  senderName: messageData.senderName || "Unknown User",
                  likes: messageData.likes || [],
                  messageRef: messageDoc.ref
                };
              }));

              setRecentMessages(prev => {
                const newMessages = [...prev];
                messages.forEach(message => {
                  const index = newMessages.findIndex(m => m.id === message.id && m.spaceId === message.spaceId);
                  if (index === -1) {
                    newMessages.push(message);
                  } else {
                    newMessages[index] = message;
                  }
                });
                return newMessages.sort((a, b) => 
                  (b.timestamp?.toDate() || 0) - (a.timestamp?.toDate() || 0)
                );
              });
              setLoading(false);
            } catch (err) {
              console.error("Error processing messages:", err);
              setError("Error processing messages: " + err.message);
              setLoading(false);
            }
          });

          unsubscribes.push(unsubscribe);
        });

      } catch (err) {
        console.error("Error in main fetch:", err);
        setError("Failed to load recent messages: " + err.message);
        setLoading(false);
      }
    };

    fetchRecentMessages();

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, []);

  const handleLike = async (message) => {
    const currentUser = auth.currentUser?.email;
    if (!currentUser) return;

    try {
      const likes = message.likes || [];
      const isLiked = likes.includes(currentUser);

      await updateDoc(message.messageRef, {
        likes: isLiked ? arrayRemove(currentUser) : arrayUnion(currentUser)
      });
    } catch (err) {
      console.error("Error updating like:", err);
      setError("Failed to update like: " + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#2C2638]">
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 p-8 overflow-y-auto">
          <h2 className="text-2xl font-semibold text-white mb-6">Recent Messages</h2>
          
          {loading ? (
            <div className="flex flex-col justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mb-4"></div>
              <p className="text-white">Loading messages...</p>
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 text-red-500 text-center">
              {error}
            </div>
          ) : recentMessages.length === 0 ? (
            <div className="text-gray-400 text-center py-8">
              No messages found. Join a space and start chatting!
            </div>
          ) : (
            <div className="space-y-8">
              {recentMessages.map((message) => (
                <div 
                  key={`${message.spaceId}-${message.id}`}
                  className="group relative border-b border-gray-700 pb-6 hover:bg-[#3A3344] transition-colors duration-200 px-6 -mx-4"
                >
                  <div className="flex items-start space-x-4 pr-2">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-[#6E5BA6] flex items-center justify-center">
                        <span className="text-white text-sm">
                          {message.senderName.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-baseline space-x-2">
                        <h3 className="text-white font-medium truncate">{message.senderName}</h3>
                        <span className="text-gray-500 text-xs">
                          {message.timestamp?.toDate().toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <p className="text-white mt-2 break-words">{message.message}</p>
                      <div className="flex items-center mt-3 space-x-4">
                        <button 
                          onClick={() => handleLike(message)}
                          className="group/like flex items-center space-x-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          {message.likes?.includes(auth.currentUser?.email) ? (
                            <svg 
                              xmlns="http://www.w3.org/2000/svg" 
                              className="h-5 w-5 text-red-500 transform scale-100 hover:scale-110 transition-transform duration-200"
                              viewBox="0 0 20 20" 
                              fill="currentColor"
                            >
                              <path 
                                fillRule="evenodd" 
                                d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" 
                                clipRule="evenodd" 
                              />
                            </svg>
                          ) : (
                            <svg 
                              xmlns="http://www.w3.org/2000/svg" 
                              className="h-5 w-5 transform scale-100 group-hover/like:scale-110 transition-transform duration-200"
                              viewBox="0 0 24 24" 
                              stroke="currentColor"
                              fill="none"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                            </svg>
                          )}
                          <span className={`text-sm ${message.likes?.includes(auth.currentUser?.email) ? 'text-red-500' : ''}`}>
                            {message.likes?.length || 0}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;
