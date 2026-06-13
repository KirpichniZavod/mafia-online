import { useState, useEffect, useRef } from 'react';

function GameChat({ socket, roomId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    socket.on('chat-message', (data) => {
      setMessages(prev => [...prev, data]);
    });

    return () => {
      socket.off('chat-message');
    };
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    
    if (!input.trim()) return;

    socket.emit('chat-message', {
      roomId: parseInt(roomId),
      message: input
    });
    
    setInput('');
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <h2 className="mb-2">Чат</h2>
      
      <div style={{
        flex: 1,
        overflowY: 'auto',
        maxHeight: '400px',
        marginBottom: '1rem',
        padding: '0.5rem',
        background: 'rgba(13, 6, 24, 0.5)',
        borderRadius: '8px'
      }}>
        {messages.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
            Нет сообщений
          </p>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} style={{ marginBottom: '0.5rem' }}>
              <strong style={{ color: 'var(--accent-secondary)' }}>
                {msg.nickname}:
              </strong>{' '}
              <span style={{ color: 'var(--text-secondary)' }}>
                {msg.message}
              </span>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSend}>
        <div className="flex gap-1">
          <input
            type="text"
            className="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Сообщение..."
            maxLength={200}
          />
          <button type="submit" className="btn btn-primary">
            →
          </button>
        </div>
      </form>
    </div>
  );
}

export default GameChat;
