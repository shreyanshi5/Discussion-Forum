import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, getDoc, updateDoc, arrayRemove, increment, runTransaction, limit, startAfter } from "firebase/firestore";
import { db, auth } from "../firebaseConfig";
import Sidebar from "../components/Sidebar";

function ChatPage() {
  const { spaceId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [space, setSpace] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastMessage, setLastMessage] = useState(null);
  const messagesEndRef = useRef(null);
  const userEmail = auth.currentUser?.email;
  const MESSAGES_PER_PAGE = 25;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch user details
  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!userEmail) return;
      
      const userRef = doc(db, "users", userEmail);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setUserDetails(userSnap.data());
      }
    };

    fetchUserDetails();
  }, [userEmail]);

  useEffect(() => {
    if (!userEmail) {
      setError("Please log in to access the chat");
      return;
    }

    const checkMembershipAndListen = async () => {
      try {
        const spaceRef = doc(db, "spaces", spaceId);
        const spaceSnap = await getDoc(spaceRef);
        
        if (!spaceSnap.exists()) {
          setError("Space not found");
          return;
        }

        const spaceData = spaceSnap.data();
        setSpace(spaceData);

        // Check if user is a member
        const members = Array.isArray(spaceData.members) ? spaceData.members : [];
        if (!members.includes(userEmail)) {
          setError("Join to chat");
          return;
        }

        // Initial messages query with limit
        const q = query(
          collection(db, "spaces", spaceId, "messages"),
          orderBy("timestamp", "desc"),
          limit(MESSAGES_PER_PAGE)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const newMessages = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
          }));
          setMessages(newMessages.reverse());
          setLastMessage(snapshot.docs[snapshot.docs.length - 1]);
          scrollToBottom();
        });

        return () => unsubscribe();
      } catch (err) {
        console.error("Error:", err);
        setError("An error occurred while loading the chat");
      }
    };

    checkMembershipAndListen();
  }, [spaceId, userEmail]);

  const loadMoreMessages = async () => {
    if (!hasMore || loading) return;

    try {
      setLoading(true);
      const q = query(
        collection(db, "spaces", spaceId, "messages"),
        orderBy("timestamp", "desc"),
        startAfter(lastMessage),
        limit(MESSAGES_PER_PAGE)
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        setHasMore(false);
        return;
      }

      const newMessages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      setMessages(prevMessages => [...newMessages.reverse(), ...prevMessages]);
      setLastMessage(snapshot.docs[snapshot.docs.length - 1]);
    } catch (error) {
      console.error("Error loading more messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const leaveSpace = async () => {
    try {
      const userEmail = auth.currentUser?.email;
      if (!userEmail) {
        throw new Error("User not authenticated");
      }

      await runTransaction(db, async (transaction) => {
        const spaceRef = doc(db, "spaces", spaceId);
        const spaceDoc = await transaction.get(spaceRef);

        if (!spaceDoc.exists()) {
          throw new Error("Space not found");
        }

        const spaceData = spaceDoc.data();
        const members = Array.isArray(spaceData.members) ? spaceData.members : [];
        const currentNumMembers = spaceData.numMembers || members.length;

        if (members.includes(userEmail)) {
          // Update the space document atomically only if user is a member
          transaction.update(spaceRef, {
            members: arrayRemove(userEmail),
            numMembers: Math.max(0, currentNumMembers - 1)
          });
        }
      });

      navigate('/spaces');
    } catch (error) {
      console.error("Error leaving space:", error);
      setError(error.message);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !userEmail || !userDetails) return;

    try {
      await addDoc(collection(db, "spaces", spaceId, "messages"), {
        message: input,
        senderId: userEmail,
        senderName: `${userDetails.firstName} ${userDetails.lastName}`.trim(),
        timestamp: serverTimestamp()
      });

      setInput("");
    } catch (err) {
      console.error("Error sending message:", err);
      setError("Failed to send message");
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-[#E7E3F2] flex">
        <Sidebar showPurpleBackground={true} />
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-center text-red-500 mb-4">{error}</div>
          <button
            onClick={() => navigate("/spaces")}
            className="bg-[#6E5BA6] text-white px-6 py-2 rounded hover:bg-[#4D3E78]"
          >
            Back to Spaces
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#E7E3F2] flex overflow-hidden">
      <Sidebar showPurpleBackground={true} />
      <div className="flex-1 flex flex-col">
        {space && (
          <div className="bg-[#6E5BA6] text-white p-6 shadow-lg flex-shrink-0">
            <div className="flex justify-between items-start max-w-7xl mx-auto">
              <div>
                <h1 className="text-2xl font-semibold mb-2">{space.spaceName}</h1>
                {space.description && (
                  <p className="text-gray-200 text-sm mb-2 max-w-2xl">{space.description}</p>
                )}
                <div className="flex items-center text-sm text-gray-200">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                  </svg>
                  {space.numMembers || 0} members
                </div>
              </div>
              <button
                onClick={leaveSpace}
                className="leave-button flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V7.414l-5-5H3zm4.707 6.707a1 1 0 00-1.414-1.414L5 9.586V8a1 1 0 00-2 0v4a1 1 0 001 1h4a1 1 0 000-2H6.414l1.293-1.293z" clipRule="evenodd" />
                </svg>
                Leave Space
              </button>
            </div>
          </div>
        )}
        
        <div className="flex-1 overflow-hidden bg-[#F3F0FA] relative">
          <div className="absolute inset-0 overflow-y-auto" onScroll={(e) => {
            const element = e.target;
            if (element.scrollTop === 0 && hasMore) {
              loadMoreMessages();
            }
          }}>
            <div className="p-6 space-y-4">
              {loading && (
                <div className="text-center py-4">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#6E5BA6]"></div>
                </div>
              )}
              <div className="max-w-7xl mx-auto space-y-4">
                {messages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`flex ${msg.senderId === userEmail ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`relative max-w-xl ${
                      msg.senderId === userEmail 
                        ? 'bg-[#6E5BA6] text-white rounded-l-lg rounded-tr-lg' 
                        : 'bg-white text-gray-800 rounded-r-lg rounded-tl-lg'
                      } p-4 shadow-md`}
                    >
                      <div className="font-medium text-sm mb-1">
                        {msg.senderId === userEmail ? `${userDetails?.firstName} ${userDetails?.lastName}` : msg.senderName}
                      </div>
                      <div className="text-sm break-words">{msg.message}</div>
                      <div className={`text-xs mt-2 ${
                        msg.senderId === userEmail ? 'text-gray-200' : 'text-gray-400'
                      }`}>
                        {msg.timestamp?.toDate().toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#E7E3F2] border-t border-[#DCD1F2] p-4 shadow-lg flex-shrink-0">
          <div className="max-w-7xl mx-auto flex gap-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 px-4 py-3 rounded-lg border border-[#DCD1F2] bg-white focus:outline-none focus:ring-2 focus:ring-[#6E5BA6] focus:border-transparent transition-all duration-200"
              placeholder="Type your message..."
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <button 
              onClick={sendMessage} 
              disabled={!input.trim()}
              className={`send-button ${!input.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="svg-wrapper-1">
                <div className="svg-wrapper">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    width="24"
                    height="24"
                  >
                    <path fill="none" d="M0 0h24v24H0z"></path>
                    <path
                      fill="currentColor"
                      d="M1.946 9.315c-.522-.174-.527-.455.01-.634l19.087-6.362c.529-.176.832.12.684.638l-5.454 19.086c-.15.529-.455.547-.679.045L12 14l6-8-8 6-8.054-2.685z"
                    ></path>
                  </svg>
                </div>
              </div>
              <span>Send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
