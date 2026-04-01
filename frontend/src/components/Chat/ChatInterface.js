import { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import styles from './ChatInterface.module.css';

export default function ChatInterface({ transcriptText }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I have analyzed the meeting transcript. What would you like to know?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || !transcriptText || isLoading) return;

    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMsg, transcript: transcriptText })
      });

      if (!response.ok) throw new Error('Network response was not ok');

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error while processing your request.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!transcriptText) {
    return (
        <div className={styles.emptyContainer}>
            <div className={styles.locked}>
                <Bot size={48} className={styles.iconLocked} />
                <p>Upload a transcript to unlock AI chat.</p>
            </div>
        </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Meeting Assistant</h3>
        <span className={styles.status}>Online</span>
      </div>
      
      <div className={styles.messageArea}>
        {messages.map((msg, idx) => (
          <div key={idx} className={`${styles.messageWrapper} ${msg.role === 'user' ? styles.userWrapper : styles.botWrapper}`}>
            <div className={`${styles.avatar} ${msg.role === 'user' ? styles.userAvatar : styles.botAvatar}`}>
              {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
            </div>
            <div className={`${styles.messageBubble} ${msg.role === 'user' ? styles.userBubble : styles.botBubble}`}>
              {msg.role === 'user' ? (
                <p>{msg.content}</p>
              ) : (
                <div className={styles.markdown}>
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className={`${styles.messageWrapper} ${styles.botWrapper}`}>
            <div className={`${styles.avatar} ${styles.botAvatar}`}>
               <Bot size={18} />
            </div>
            <div className={`${styles.messageBubble} ${styles.botBubble}`}>
              <Loader2 className={styles.spinner} size={20} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className={styles.inputArea}>
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about the meeting..."
          className={styles.input}
          disabled={isLoading}
        />
        <button type="submit" disabled={!input.trim() || isLoading} className={styles.sendButton}>
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
