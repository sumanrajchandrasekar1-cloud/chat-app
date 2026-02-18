import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { Send, User as UserIcon, MessageSquare } from 'lucide-react'
import './App.css'

const API_URL = 'http://localhost:8000';
const WS_URL = 'ws://localhost:8000/ws';

function App() {
  const [username, setUsername] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const ws = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isLoggedIn && currentUser) {
      // Connect to WebSocket
      ws.current = new WebSocket(`${WS_URL}/${currentUser.id}`);

      ws.current.onopen = () => {
        console.log('');
      };

      ws.current.onmessage = (event) => {
        const message = JSON.parse(event.data);
        // If the message belongs to the current conversation, add it
        if (
          (selectedUser &&
            ((message.sender_id === selectedUser.id && message.receiver_id === currentUser.id) ||
              (message.sender_id === currentUser.id && message.receiver_id === selectedUser.id)))
        ) {
          setMessages((prev) => [...prev, message]);
        }
      };

      ws.current.onclose = () => {
        console.log('Disconnected from WebSocket');
      };

      return () => {
        if (ws.current) ws.current.close();
      };
    }
  }, [isLoggedIn, currentUser, selectedUser]);

  useEffect(() => {
    // Fetch users periodically to see new joiners
    const interval = setInterval(fetchUsers, 5000);
    fetchUsers();
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (selectedUser && currentUser) {
      fetchMessages(currentUser.id, selectedUser.id);
    }
  }, [selectedUser, currentUser]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/users/`);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchMessages = async (userId, otherUserId) => {
    try {
      const response = await axios.get(`${API_URL}/messages/${userId}/${otherUserId}`);
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username) return;
    try {
      const response = await axios.post(`${API_URL}/users/`, { username });
      setCurrentUser(response.data);
      setIsLoggedIn(true);
      fetchUsers();
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed. Ensure backend is running.');
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage || !ws.current || !selectedUser) return;

    const messageData = {
      receiver_id: selectedUser.id,
      content: inputMessage
    };

    ws.current.send(JSON.stringify(messageData));
    setInputMessage('');
    // Optimistic update handled by WebSocket echo for simplicity, 
    // or we can add it here directly if we trust the network. 
    // Based on backend implementation, it sends back to sender too.
  };

  if (!isLoggedIn) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1>Welcome to Chat</h1>
          <form onSubmit={handleLogin}>
            <input
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="login-input"
            />
            <button type="submit" className="login-btn">Join Chat</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="sidebar">
        <div className="sidebar-header">
          <UserIcon size={24} />
          <span>{currentUser.username}</span>
        </div>
        <div className="users-list">
          {users.filter(u => u.id !== currentUser.id).map(user => (
            <div
              key={user.id}
              className={`user-item ${selectedUser?.id === user.id ? 'active' : ''}`}
              onClick={() => setSelectedUser(user)}
            >
              <div className="avatar">{user.username[0].toUpperCase()}</div>
              <span>{user.username}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="chat-area">
        {selectedUser ? (
          <>
            <div className="chat-header">
              <span className="chat-with">Chatting with {selectedUser.username}</span>
            </div>
            <div className="messages-container">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`message ${msg.sender_id === currentUser.id ? 'sent' : 'received'}`}
                >
                  <div className="message-content">
                    {msg.content}
                    <div className="timestamp">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form className="message-input-area" onSubmit={sendMessage}>
              <input
                type="text"
                placeholder="Type a message..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
              />
              <button type="submit">
                <Send size={20} />
              </button>
            </form>
          </>
        ) : (
          <div className="no-chat-selected">
            <MessageSquare size={48} />
            <p>Select a user to start chatting</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
