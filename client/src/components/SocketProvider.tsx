'use client';

import React, { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatStore } from '@/store/useChatStore';
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket';
import { queryClient } from '@/lib/queryClient';

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { token, isAuthenticated, user } = useAuthStore();
  const { addOnlineUser, removeOnlineUser, setTyping } = useChatStore();

  useEffect(() => {
    if (!isAuthenticated || !token) {
      disconnectSocket();
      return;
    }

    // Connect Socket.IO client
    const socket = connectSocket(token);

    // Sync visibility state with the server (active/inactive focus tracking)
    const handleVisibilityChange = () => {
      if (socket && socket.connected) {
        socket.emit('user:active_state', { active: document.visibilityState === 'visible' });
      }
    };

    socket.on('connect', () => {
      socket.emit('user:active_state', { active: document.visibilityState === 'visible' });
    });

    if (socket.connected) {
      socket.emit('user:active_state', { active: document.visibilityState === 'visible' });
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Bind event listeners
    socket.on('user:status', (data: { userId: string; status: 'online' | 'offline'; lastSeen?: string }) => {
      if (data.status === 'online') {
        addOnlineUser(data.userId);
      } else {
        removeOnlineUser(data.userId);
      }
      // Invalidate chats list to refresh statuses in sidebar
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    });

    socket.on('typing:start', (data: { chatId: string; userId: string }) => {
      setTyping(data.chatId, data.userId, true);
    });

    socket.on('typing:stop', (data: { chatId: string; userId: string }) => {
      setTyping(data.chatId, data.userId, false);
    });

    socket.on('message:receive', (message: any) => {
      // Directly append the new message to the query cache (optimistic sync)
      queryClient.setQueryData(['messages', message.chatId], (oldData: any) => {
        if (!oldData) return { messages: [message] };
        const messagesList = oldData.messages || [];
        
        // Check if message already exists by ID
        const exists = messagesList.some((m: any) => m._id === message._id);
        if (exists) return oldData;

        // Check if there is an optimistic temp placeholder for this message
        const tempIndex = messagesList.findIndex(
          (m: any) =>
            m._id.startsWith('temp-') &&
            (m.message === message.message || (m.fileUrl && m.fileUrl === message.fileUrl))
        );

        const updated = [...messagesList];
        if (tempIndex !== -1) {
          // Swap optimistic placeholder with real server message
          updated[tempIndex] = message;
        } else {
          // Append new message
          updated.push(message);
        }

        return {
          ...oldData,
          messages: updated,
        };
      });

      // Invalidate the chats list query to update the unread counters and last message updates in sidebar
      queryClient.invalidateQueries({ queryKey: ['chats'] });

      // Trigger web notifications if browser is minimized / not focused
      // and the sender is not the current user
      if (user && message.senderId._id !== user._id) {
        triggerNotification(message);
      }
    });

    socket.on('message:edited', (data: { messageId: string; newMessage: string; chatId: string }) => {
      queryClient.invalidateQueries({ queryKey: ['messages', data.chatId] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    });

    socket.on('message:deleted', (data: { messageId: string; chatId: string }) => {
      queryClient.invalidateQueries({ queryKey: ['messages', data.chatId] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    });

    socket.on('message:reacted', (data: { messageId: string; reactions: any[]; chatId: string }) => {
      queryClient.invalidateQueries({ queryKey: ['messages', data.chatId] });
    });

    socket.on('message:seen', (data: { messageId: string; userId: string; chatId: string }) => {
      queryClient.invalidateQueries({ queryKey: ['messages', data.chatId] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    });

    // Request Notification permission
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }

    // Helper to subscribe client to push notifications
    const subscribeToPush = async (reg: ServiceWorkerRegistration) => {
      try {
        let subscription = await reg.pushManager.getSubscription();
        if (!subscription) {
          const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BCj0xzJ0CYFoki6Uy5LujHSM4_ZYRjnDhr9Q2E0cZqgGww1Ip6OrdY07uJ_0BZm-wke2Z52TRGNU1yV4UfH4Ysk';
          const convertedVapidKey = urlBase64ToUint8Array(publicVapidKey);
          
          subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey
          });
        }

        await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/users/push-subscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ subscription }),
        });
      } catch (err) {
        console.error('Error subscribing to push:', err);
      }
    };

    // Request Notification permission and Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('Service Worker registered scope:', reg.scope);
          if (Notification.permission === 'granted') {
            subscribeToPush(reg);
          } else if (Notification.permission === 'default') {
            Notification.requestPermission().then((permission) => {
              if (permission === 'granted') {
                subscribeToPush(reg);
              }
            });
          }
        })
        .catch((err) => console.error('Service Worker registration failed:', err));
    }

    // Listen to messages from Service Worker
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SELECT_CHAT') {
        useChatStore.getState().setActiveChatId(event.data.chatId);
      }
    };
    window.addEventListener('message', handleSWMessage);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('message', handleSWMessage);
      disconnectSocket();
    };
  }, [isAuthenticated, token, user, addOnlineUser, removeOnlineUser, setTyping]);

  // Toast Notification Helper
  const triggerNotification = (message: any) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      const senderName = message.senderId?.name || 'Someone';
      const body = message.fileUrl
        ? `Sent a file: ${message.fileType || 'attachment'}`
        : message.message || '';

      const notification = new Notification(`New message from ${senderName}`, {
        body,
        icon: message.senderId?.photo || '/favicon.ico',
        tag: message.chatId, // Collapse multiple notifications from same chat
      });

      notification.onclick = () => {
        window.focus();
        useChatStore.getState().setActiveChatId(message.chatId);
      };
    }
  };

  return <>{children}</>;
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
