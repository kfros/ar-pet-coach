import { getMessaging, getToken } from "firebase/messaging";
import { app } from "./firebase";

export const requestNotificationPermission = async () => {
    try {
        const messaging = getMessaging(app);
        const permission = await Notification.requestPermission();

        if (permission === 'granted') {
            const token = await getToken(messaging, {
                vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
            });
            console.log("Notification Token:", token);
            return token;
        } else {
            console.log("Notification permission denied");
            return null;
        }
    } catch (error) {
        console.error("Error requesting notification permission:", error);
        return null;
    }
};
