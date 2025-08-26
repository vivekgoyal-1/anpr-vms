import { useEffect, useRef, useState } from "react";

interface WebSocketMessage {
  event: string;
  data: any;
}

export function useWebSocket(onMessage?: (message: WebSocketMessage) => void) {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let reconnectTimer: number;
    
    const connect = () => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        setIsConnected(true);
        console.log("WebSocket connected");
      };

      ws.current.onclose = () => {
        setIsConnected(false);
        console.log("WebSocket disconnected");
        // Reconnect after 3 seconds
        reconnectTimer = window.setTimeout(connect, 3000);
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          onMessage?.(message);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      ws.current.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [onMessage]);

  const sendMessage = (event: string, data: any) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ event, data }));
    }
  };

  return { isConnected, sendMessage };
}
// import { useEffect, useRef, useState } from "react";

// interface WebSocketMessage {
//   event: string;
//   data: any;
// }

// export function useWebSocket(
//   onMessage?: (message: WebSocketMessage) => void
// ) {
//   const ws = useRef<WebSocket | null>(null);
//   const [isConnected, setIsConnected] = useState(false);
//   const reconnectAttempts = useRef(0);
//   const reconnectTimer = useRef<number | null>(null);

//   useEffect(() => {
//     const connect = () => {
//       const token = localStorage.getItem("token");
//       const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
//       const wsUrl = `${protocol}//${window.location.host}/ws?token=${token}`;
      
//       ws.current = new WebSocket(wsUrl);

//       ws.current.onopen = () => {
//         console.log("WebSocket connected");
//         setIsConnected(true);
//         reconnectAttempts.current = 0; // Reset attempts
//       };

//       ws.current.onclose = () => {
//         console.log("WebSocket disconnected");
//         setIsConnected(false);

//         // Exponential backoff (max 30s)
//         const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 30000);
//         reconnectAttempts.current += 1;

//         console.log(`Reconnecting in ${delay / 1000}s...`);

//         reconnectTimer.current = window.setTimeout(connect, delay);
//       };

//       ws.current.onmessage = (event) => {
//         try {
//           const message = JSON.parse(event.data);
//           onMessage?.(message);
//         } catch (error) {
//           console.error("Failed to parse WebSocket message:", error);
//         }
//       };

//       ws.current.onerror = (error) => {
//         console.error("WebSocket error:", error);
//         ws.current?.close(); // Force close to trigger reconnect
//       };
//     };

//     connect();
//     console.log('Callback stable?', onMessage);

//     return () => {
//       if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
//       ws.current?.close();
//     };
//   }, [onMessage]);
// console.log('Callback stable?', onMessage);

//   const sendMessage = (event: string, data: any) => {
//     if (ws.current?.readyState === WebSocket.OPEN) {
//       ws.current.send(JSON.stringify({ event, data }));
//     }
//   };

//   return { isConnected, sendMessage };
// }
