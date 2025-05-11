import React, { createContext, useContext } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:5001');
const SocketContext = createContext(socket);

export const SocketProvider = ({ children }) => {
  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  return useContext(SocketContext);
}; 