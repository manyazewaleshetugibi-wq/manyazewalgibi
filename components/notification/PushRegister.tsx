// components/PushRegister.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

// Helper function to safely parse base64 VAPID Key
function urlBase64ToUint8Array(base64String: string) {
  if (!base64String) {
    throw new Error('VAPID public key is not defined');
  }
  
  try {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  } catch (error) {
    console.error('Error converting VAPID key:', error);
    throw new Error('Invalid VAPID public key format');
  }
}

export default function PushRegister() {
  const { data: session, status } = useSession();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');

  // Check notification permission status
  useEffect(() => {
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  // Check if service worker is supported and subscription exists
  useEffect(() => {
    const checkSubscription = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.log('Push notifications not supported');
        return;
      }

      try {
        // Check if service worker is already registered
        let registration = await navigator.serviceWorker.getRegistration();
        
        if (!registration) {
          console.log('Service Worker not registered, registering now...');
          registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
            updateViaCache: 'none'
          });
          console.log('Service Worker registered successfully');
        }

        // Check for existing subscription
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
        
        console.log('Subscription status:', !!subscription);
      } catch (err) {
        console.error('Error checking subscription:', err);
        setError('Failed to check notification subscription');
      }
    };

    checkSubscription();
  }, []);

  const subscribeToPush = async () => {
    setError(null);
    setIsLoading(true);

    try {
      // Check if user is authenticated
      if (!session?.user?.id) {
        setError('Please log in to enable notifications');
        setIsLoading(false);
        return;
      }

      // Check if VAPID key is configured
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        setError('VAPID public key is not configured');
        setIsLoading(false);
        return;
      }

      // Request notification permission
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      
      if (permission !== 'granted') {
        setError('Notification permission denied. Please enable notifications in your browser settings.');
        setIsLoading(false);
        return;
      }

      // Get service worker registration
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none'
        });
        await navigator.serviceWorker.ready;
      }

      // Subscribe to push notifications
      let subscription;
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        });
      } catch (subscribeError: any) {
        console.error('Push subscription error:', subscribeError);
        
        // Handle specific subscription errors
        if (subscribeError.name === 'InvalidStateError') {
          setError('A subscription already exists or is in invalid state. Please unsubscribe first.');
        } else if (subscribeError.name === 'NotAllowedError') {
          setError('Push notifications are blocked. Please enable them in your browser settings.');
        } else {
          setError(`Failed to subscribe: ${subscribeError.message || 'Unknown error'}`);
        }
        setIsLoading(false);
        return;
      }

      // Convert subscription to plain object for sending to API
      const subscriptionData = {
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime,
        keys: {
          auth: subscription.getKey('auth') ? btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!))) : '',
          p256dh: subscription.getKey('p256dh') ? btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))) : ''
        }
      };

      // Send subscription to API
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          subscription: subscriptionData, 
          userId: session.user.id 
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save subscription');
      }

      setIsSubscribed(true);
      setError(null);
      console.log('Successfully subscribed to push notifications');

    } catch (err: any) {
      console.error('Subscription setup failed:', err);
      setError(err.message || 'Failed to subscribe to notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribeFromPush = async () => {
    setError(null);
    setIsLoading(true);

    try {
      // Get service worker registration
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        setError('No service worker registration found');
        setIsLoading(false);
        return;
      }

      // Get existing subscription
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        setIsSubscribed(false);
        setIsLoading(false);
        return;
      }

      // Unsubscribe from push
      const unsubscribed = await subscription.unsubscribe();
      if (!unsubscribed) {
        setError('Failed to unsubscribe');
        setIsLoading(false);
        return;
      }

      // Delete subscription from server
      const endpoint = subscription.endpoint;
      const response = await fetch('/api/notifications/subscribe', {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ endpoint })
      });

      if (!response.ok) {
        console.warn('Failed to delete subscription from server:', await response.text());
      }

      setIsSubscribed(false);
      setError(null);
      console.log('Successfully unsubscribed from push notifications');

    } catch (err: any) {
      console.error('Unsubscribe failed:', err);
      setError(err.message || 'Failed to unsubscribe');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="p-4 border rounded-lg bg-white shadow-sm">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
          <span className="ml-2 text-gray-600">Processing...</span>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="p-4 border rounded-lg bg-red-50 border-red-200">
        <div className="flex items-start">
          <svg className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-1 text-xs text-red-600 hover:text-red-800 underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            {isSubscribed ? (
              <svg className="h-6 w-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="h-6 w-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
              </svg>
            )}
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900">
              {isSubscribed ? 'Notifications Enabled' : 'Push Notifications'}
            </h3>
            <p className="text-xs text-gray-500">
              {isSubscribed 
                ? 'You will receive real-time updates' 
                : permissionStatus === 'denied' 
                ? 'Notifications blocked in browser' 
                : 'Get notified about important updates'}
            </p>
          </div>
        </div>

        <button
          onClick={isSubscribed ? unsubscribeFromPush : subscribeToPush}
          disabled={isLoading || permissionStatus === 'denied' || status !== 'authenticated'}
          className={`
            px-4 py-2 rounded-md text-sm font-medium transition-colors
            ${isSubscribed 
              ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
            }
            ${(isLoading || permissionStatus === 'denied' || status !== 'authenticated') 
              ? 'opacity-50 cursor-not-allowed' 
              : 'cursor-pointer'
            }
          `}
        >
          {isSubscribed ? 'Disable' : 'Enable'}
        </button>
      </div>

      {/* Show permission status */}
      {permissionStatus === 'denied' && (
        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
          Notifications are blocked. Please enable them in your browser settings.
        </div>
      )}

      {/* Show authentication status */}
      {status !== 'authenticated' && (
        <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
          Please log in to enable push notifications.
        </div>
      )}
    </div>
  );
}