import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, getDoc, updateDoc, arrayRemove, increment, runTransaction, limit, startAfter, deleteDoc, where, getDocs } from "firebase/firestore";
import { db, auth } from "../firebaseConfig";
import Sidebar from "../components/Sidebar";
import { checkMessage } from '../services/nlpService';
import WarningPopup from '../components/WarningPopup';

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
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [warningType, setWarningType] = useState('warning');

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

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !userEmail || !userDetails) return;

    try {
      // Get user details first
      const userDoc = await getDoc(doc(db, 'users', userEmail));
      const userData = userDoc.data();
      
      // Check if user is already blocked
      if (userData.isBlocked) {
        setWarningMessage('Your account has been blocked due to multiple warnings. You cannot participate in conversations.');
        setWarningType('error');
        setShowWarning(true);
        setInput(''); // Clear the input
        return;
      }

      const senderName = `${userData.firstName} ${userData.lastName}`;

      // Add message to Firestore first
      const messageRef = await addDoc(collection(db, 'spaces', spaceId, 'messages'), {
        message: input,
        senderId: userEmail,
        senderName: senderName,
        timestamp: serverTimestamp(),
        flagged: false
      });

      // Clear input immediately after sending
      setInput('');

      // Then check for toxicity
      const nlpResult = await checkMessage(input);
      
      if (nlpResult.is_toxic) {
        // Update message with flagged status
        await updateDoc(messageRef, {
          flagged: true
        });

        const currentWarnings = userData.warnings || 0;
        const newWarnings = currentWarnings + 1;
        
        // Update user warnings and block status in a transaction to ensure atomicity
        await runTransaction(db, async (transaction) => {
          const userRef = doc(db, 'users', userEmail);
          const userDoc = await transaction.get(userRef);
          const userData = userDoc.data();
          
          transaction.update(userRef, {
            warnings: newWarnings,
            isBlocked: newWarnings >= 3
          });
        });

        if (newWarnings >= 3) {
          setWarningMessage('Your account has been blocked due to multiple warnings. You cannot participate in conversations.');
          setWarningType('error');
          setShowWarning(true);
        } else {
          setWarningMessage(`Warning: Your message contains inappropriate content. You have ${3 - newWarnings} warnings remaining.`);
          setWarningType('warning');
          setShowWarning(true);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setWarningMessage('Error sending message. Please try again.');
      setWarningType('error');
      setShowWarning(true);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return {
      time: date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
      }),
      date: date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    };
  };

  const deleteMessage = async (messageId) => {
    console.log("Delete function called with messageId:", messageId);
    
    if (!messageId || !spaceId) {
      console.error("Cannot delete message: Missing required information");
      return;
    }

    try {
      const messageRef = doc(db, "spaces", spaceId, "messages", messageId);
      await deleteDoc(messageRef);
      console.log("Message deleted successfully");
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  useEffect(() => {
    const handleClickOutside = () => {
      if (activeDropdown !== null) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeDropdown]);

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
            <div className="px-1 py-4 space-y-2">
              {loading && (
                <div className="text-center py-4">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#6E5BA6]"></div>
                </div>
              )}
              <div className="space-y-6">
        {messages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`flex ${msg.senderId === userEmail ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex items-start space-x-3 max-w-[70%] ${
                      msg.senderId === userEmail ? 'flex-row-reverse space-x-reverse' : 'flex-row'
                    }`}>
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-10 h-10 rounded-full bg-[#6E5BA6] flex items-center justify-center shadow-md">
                          <span className="text-white text-sm font-medium">
                            {msg.senderName.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                      </div>
                      <div className={`relative flex-shrink break-words ${
                        msg.senderId === userEmail 
                          ? 'bg-[#6E5BA6] text-white rounded-l-xl rounded-tr-xl' 
                          : 'bg-white text-gray-800 rounded-r-xl rounded-tl-xl'
                        } p-4 shadow-md min-w-[200px]`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-medium text-sm">
                            {msg.senderName}
                          </div>
                          {msg.senderId === userEmail && (
                            <div className="relative inline-block">
                              <button 
                                type="button"
                                className="p-1.5 hover:bg-[#5A4A8A] rounded-full transition-colors -mr-1"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log("Dropdown toggle clicked");
                                  setActiveDropdown(activeDropdown === msg.id ? null : msg.id);
                                }}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                                </svg>
                              </button>
                              {activeDropdown === msg.id && (
                                <div 
                                  className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50"
                                >
                                  <button 
                                    type="button"
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 cursor-pointer"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      console.log("Delete button clicked");
                                      deleteMessage(msg.id);
                                      setActiveDropdown(null);
                                    }}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    <span>Delete Message</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="text-sm break-words">{msg.message}</div>
                        <div className={`text-xs mt-2 ${
                          msg.senderId === userEmail ? 'text-gray-200' : 'text-gray-400'
                        }`}>
                          {formatDate(msg.timestamp).time} • {formatDate(msg.timestamp).date}
                        </div>
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
                  sendMessage(e);
                }
              }}
        />
        <button
          onClick={(e) => {
            e.preventDefault();
            sendMessage(e);
          }}
              disabled={!input.trim()}
              className={`send-button px-4 py-2 rounded-lg bg-[#6E5BA6] text-white hover:bg-[#5A4A8A] transition-colors flex items-center gap-2 text-sm ${!input.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                width="18"
                height="18"
                className="text-white"
              >
                <path fill="none" d="M0 0h20v20H0z"></path>
                <path
                  fill="currentColor"
                  d="M1.946 9.315c-.522-.174-.527-.455.01-.634l19.087-6.362c.529-.176.832.12.684.638l-5.454 19.086c-.15.529-.455.547-.679.045L12 14l6-8-8 6-8.054-2.685z"
                ></path>
              </svg>
              <span>Send</span>
        </button>
          </div>
        </div>
        {showWarning && (
          <WarningPopup
            message={warningMessage}
            type={warningType}
            onClose={() => setShowWarning(false)}
          />
        )}
      </div>
    </div>
  );
}

export default ChatPage;
