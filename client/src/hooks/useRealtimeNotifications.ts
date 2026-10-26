"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAppDispatch, useAppSelector } from "./redux";
import { apiSlice } from "@/redux/features/api/apiSlice";
import { socketOrigin } from "@/utils/socketUrl";

// While someone is signed in, keep a Socket.io connection open and refresh
// their notifications the moment the server pushes a new one. Returns whether
// the connection is up (the bell polls slowly then, and as before if not).
export const useRealtimeNotifications = (): boolean => {
  const dispatch = useAppDispatch();
  const userId = useAppSelector((state) => state.auth.user?._id);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const origin = socketOrigin(process.env.NEXT_PUBLIC_SERVER_URI);
    if (!userId || !origin) return;

    const socket = io(origin, {
      withCredentials: true, // the login cookie authenticates the socket
      transports: ["websocket", "polling"],
      reconnectionDelayMax: 30000,
    });
    const refresh = () => dispatch(apiSlice.util.invalidateTags(["Notifications"]));

    socket.on("connect", () => {
      setConnected(true);
      refresh(); // catch up on anything that arrived while disconnected
    });
    socket.on("disconnect", () => setConnected(false));
    // An expired access token is refused; the next API call renews it and the
    // automatic reconnect then gets through.
    socket.on("connect_error", () => setConnected(false));
    socket.on("notification:new", refresh);

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      setConnected(false);
    };
  }, [userId, dispatch]);

  return connected;
};
